"""
训练控制模块 - 集成WebSocket训练控制功能
"""
import asyncio
import threading
import time
from typing import Optional, Dict, Any
import sys
import os

# 添加backend路径到sys.path
backend_path = os.path.join(os.path.dirname(__file__), '..')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from websocket.manager import manager

class TrainingController:
    """训练控制器 - 处理WebSocket训练控制"""
    
    def __init__(self):
        self.is_running = False
        self.current_iteration = 0
        self.should_stop = False
        self.websocket_thread = None
        self.loop = None
        
    def start_websocket_server(self, host: str = "127.0.0.1", port: int = 8765):
        """启动WebSocket服务器"""
        def run_server():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            
            # 这里可以添加WebSocket服务器启动逻辑
            # 目前使用现有的manager来处理连接
            print(f"训练控制WebSocket服务器启动在 {host}:{port}")
            
            try:
                self.loop.run_forever()
            except KeyboardInterrupt:
                pass
            finally:
                self.loop.close()
        
        self.websocket_thread = threading.Thread(target=run_server, daemon=True)
        self.websocket_thread.start()
        
    def stop_websocket_server(self):
        """停止WebSocket服务器"""
        if self.loop:
            self.loop.call_soon_threadsafe(self.loop.stop)
        if self.websocket_thread:
            self.websocket_thread.join(timeout=1.0)
    
    def should_continue_training(self) -> bool:
        """检查是否应该继续训练"""
        training_state = manager.get_training_control_state()
        
        # 检查是否应该停止训练
        if training_state.stop_at_value > 0 and self.current_iteration >= training_state.stop_at_value:
            return False
            
        # 检查是否暂停训练
        if not training_state.do_training and not training_state.single_training_step:
            return False
            
        return True
    
    def should_do_single_step(self) -> bool:
        """检查是否应该执行单步训练"""
        training_state = manager.get_training_control_state()
        if training_state.single_training_step:
            # 重置单步标志
            training_state.single_training_step = False
            return True
        return False
    
    def get_current_camera_id(self) -> int:
        """获取当前相机ID"""
        training_state = manager.get_training_control_state()
        return training_state.current_camera_id
    
    def should_render_grad(self) -> bool:
        """检查是否应该渲染梯度"""
        training_state = manager.get_training_control_state()
        return training_state.render_grad
    
    def update_training_stats(self, iteration: int, num_gaussians: int, loss: float, sh_degree: int):
        """更新训练统计数据"""
        self.current_iteration = iteration
        manager.update_training_stats(iteration, num_gaussians, loss, sh_degree)
        
        # 异步发送统计数据到前端
        if self.loop and not self.loop.is_closed():
            asyncio.run_coroutine_threadsafe(
                manager.send_training_stats({
                    "iteration": iteration,
                    "num_gaussians": num_gaussians,
                    "loss": loss,
                    "sh_degree": sh_degree
                }),
                self.loop
            )
    
    def send_training_image(self, image_data: bytes, width: int, height: int):
        """发送训练图像到前端"""
        if self.loop and not self.loop.is_closed():
            asyncio.run_coroutine_threadsafe(
                manager.send_training_image(image_data, width, height),
                self.loop
            )
    
    def wait_for_training_signal(self, timeout: float = 0.1):
        """等待训练信号（用于暂停时的等待）"""
        start_time = time.time()
        while not self.should_continue_training() and not self.should_do_single_step():
            if time.time() - start_time > timeout:
                break
            time.sleep(0.01)  # 短暂休眠避免CPU占用过高

# 全局训练控制器实例
training_controller = TrainingController()