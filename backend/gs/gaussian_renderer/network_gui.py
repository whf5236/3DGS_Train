#
# Copyright (C) 2023, Inria
# GRAPHDECO research group, https://team.inria.fr/graphdeco
# All rights reserved.
#
# This software is free for non-commercial, research and evaluation use
# under the terms of the LICENSE.md file.
#
# For inquiries contact  george.drettakis@inria.fr
#

import torch
import json
import traceback
from scene.cameras import CustomCam
import psutil
import platform

host = "127.0.0.1"
port = 6009

import asyncio
import websockets
import threading
import struct
import numpy as np

# Global state
conn = None
current_message = None
training_paused = False
single_step = False
stop_at_value = -1
render_grad = False

# Latest render result
latest_width = 0
latest_height = 0
latest_image_bytes = bytes([])
latest_stats = {}

def get_device_info():
    """获取设备信息"""
    device_info = {
        'name': 'Unknown GPU',
        'capability': 'Unknown',
        'driver': 'Unknown',
        'cudaVersion': 'Unknown',
        'clockRate': 'Unknown',
        'temperature': 0,
        'memoryUsed': 0,
        'memoryTotal': 0
    }
    
    try:
        if torch.cuda.is_available():
            device = torch.cuda.current_device()
            device_props = torch.cuda.get_device_properties(device)
            
            # 基本设备信息
            device_info['name'] = device_props.name
            device_info['capability'] = f"{device_props.major}.{device_props.minor}"
            device_info['memoryTotal'] = device_props.total_memory // (1024 * 1024)  # MB
            
            # 内存使用情况
            memory_allocated = torch.cuda.memory_allocated(device) // (1024 * 1024)  # MB
            device_info['memoryUsed'] = memory_allocated
            
            # CUDA 版本
            device_info['cudaVersion'] = torch.version.cuda or 'Unknown'
            
            # 时钟频率 (kHz to MHz)
            if hasattr(device_props, 'clock_rate'):
                device_info['clockRate'] = f"{device_props.clock_rate // 1000} MHz"
            
            # 尝试获取温度（这个可能不总是可用）
            try:
                import pynvml
                pynvml.nvmlInit()
                handle = pynvml.nvmlDeviceGetHandleByIndex(device)
                temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                device_info['temperature'] = temp
                
                # 获取驱动版本
                driver_version = pynvml.nvmlSystemGetDriverVersion()
                device_info['driver'] = driver_version.decode('utf-8') if isinstance(driver_version, bytes) else str(driver_version)
                
            except ImportError:
                # pynvml 不可用，使用默认值
                device_info['temperature'] = 45  # 默认温度
                device_info['driver'] = 'Unknown'
            except Exception as e:
                print(f"Error getting GPU temperature/driver: {e}")
                device_info['temperature'] = 45
                device_info['driver'] = 'Unknown'
                
    except Exception as e:
        print(f"Error getting device info: {e}")
    
    return device_info

async def handle_client(websocket, path):
    """Handle WebSocket client connection"""
    global conn, current_message, training_paused, single_step, stop_at_value, render_grad
    global latest_width, latest_height, latest_image_bytes, latest_stats
    
    conn = websocket
    
    try:
        async for message in websocket:
            try:
                # Parse JSON message from frontend
                if isinstance(message, str):
                    data = json.loads(message)
                    current_message = data
                    
                    # Extract training control parameters
                    training_paused = not data.get('train', True)
                    single_step = data.get('single_training_step', False)
                    stop_at_value = data.get('stop_at_value', -1)
                    render_grad = data.get('render_grad', False)
                    
                    # Send back image and stats
                    if latest_image_bytes:
                        # Send image data
                        header = struct.pack('ii', latest_width, latest_height)
                        await websocket.send(header + latest_image_bytes)
                        
                        # Send stats as JSON
                        if latest_stats:
                            stats_json = json.dumps(latest_stats).encode('utf-8')
                            stats_header = struct.pack('i', len(stats_json))
                            await websocket.send(stats_header + stats_json)
                    
                    # Send device info periodically (every 10th message to avoid spam)
                    if not hasattr(handle_client, 'device_info_counter'):
                        handle_client.device_info_counter = 0
                    handle_client.device_info_counter += 1
                    
                    if handle_client.device_info_counter % 10 == 1:  # Send device info every 10 messages
                        device_info = get_device_info()
                        device_json = json.dumps({
                            'type': 'device_info',
                            'data': device_info
                        }).encode('utf-8')
                        device_header = struct.pack('i', len(device_json))
                        await websocket.send(device_header + device_json)
                            
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
            except Exception as e:
                print(f"Error handling message: {e}")
                traceback.print_exc()
                
    except websockets.exceptions.ConnectionClosed:
        print(f"Client disconnected")
    finally:
        conn = None
        current_message = None

async def start_server(wish_host, wish_port):
    """Start WebSocket server"""
    async with websockets.serve(handle_client, wish_host, wish_port):
        print(f"Network GUI WebSocket server started on {wish_host}:{wish_port}")
        await asyncio.Future()  # run forever

def run_asyncio_loop(wish_host, wish_port):
    """Run asyncio event loop in separate thread"""
    asyncio.run(start_server(wish_host, wish_port))

def init(wish_host=None, wish_port=None):
    """Initialize WebSocket server"""
    if wish_host is None:
        wish_host = host
    if wish_port is None:
        wish_port = port
    
    thread = threading.Thread(target=run_asyncio_loop, args=[wish_host, wish_port], daemon=True)
    thread.start()
    return thread

def try_connect():
    """Try to establish connection (for compatibility)"""
    # Connection is handled by WebSocket server
    pass

def receive():
    """
    Receive camera parameters and training control from frontend
    Returns: (custom_cam, do_training, convert_SHs_python, compute_cov3D_python, keep_alive, scaling_modifier)
    """
    global current_message, training_paused, single_step, stop_at_value
    
    if current_message is None or conn is None:
        return None, True, False, False, True, 1.0
    
    try:
        data = current_message
        
        # Parse camera parameters
        resolution_x = data.get('resolution_x', 800)
        resolution_y = data.get('resolution_y', 800)
        fov_x = data.get('fov_x', 0.785)  # radians
        fov_y = data.get('fov_y', 0.785)
        
        # Parse transformation matrices
        view_matrix = data.get('view_matrix', None)
        view_proj_matrix = data.get('view_projection_matrix', None)
        
        if view_matrix is not None and view_proj_matrix is not None:
            # Convert to torch tensors
            world_view_transform = torch.tensor(
                np.array(view_matrix).reshape(4, 4), 
                dtype=torch.float32
            ).cuda()
            
            full_proj_transform = torch.tensor(
                np.array(view_proj_matrix).reshape(4, 4),
                dtype=torch.float32
            ).cuda()
            
            # Create custom camera
            custom_cam = CustomCam(
                width=resolution_x,
                height=resolution_y,
                fovy=fov_y,
                fovx=fov_x,
                world_view_transform=world_view_transform,
                full_proj_transform=full_proj_transform,
                znear=data.get('z_near', 0.01),
                zfar=data.get('z_far', 100.0)
            )
        else:
            custom_cam = None
        
        # Parse training control
        do_training = not training_paused
        convert_SHs_python = data.get('shs_python', False)
        compute_cov3D_python = data.get('rot_scale_python', False)
        keep_alive = data.get('keep_alive', True)
        scaling_modifier = data.get('scaling_modifier', 1.0)
        
        return custom_cam, do_training, convert_SHs_python, compute_cov3D_python, keep_alive, scaling_modifier
        
    except Exception as e:
        print(f"Error in receive(): {e}")
        traceback.print_exc()
        return None, True, False, False, True, 1.0

def send(image_bytes, source_path=None):
    """
    Send rendered image back to frontend
    image_bytes: memoryview of RGB image data
    """
    global latest_image_bytes, latest_width, latest_height
    
    if image_bytes is not None:
        latest_image_bytes = bytes(image_bytes)

def send_stats(stats_dict):
    """
    Update training statistics to be sent to frontend
    stats_dict: dict with keys like iteration, num_gaussians, loss, sh_degree, paused
    """
    global latest_stats
    latest_stats = stats_dict

def should_continue_training(iteration, max_iterations):
    """
    Check if training should continue
    Returns: (should_train, should_single_step)
    """
    global training_paused, single_step, stop_at_value
    
    # Check stop iteration
    if stop_at_value > 0 and iteration >= stop_at_value:
        return False, False
    
    # Check if paused
    if training_paused and not single_step:
        return False, False
    
    # Check single step
    if single_step:
        temp = single_step
        single_step = False  # Reset single step flag
        return False, temp
    
    # Check max iterations
    if iteration >= max_iterations:
        return False, False
    
    return True, False

def get_render_grad():
    """Get whether to render gradients"""
    global render_grad
    return render_grad

