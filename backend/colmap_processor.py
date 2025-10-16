import os
import logging
import shutil
import subprocess
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, Callable
from datetime import datetime

class ColmapProcessor:
    """COLMAP 点云处理器 - 基于 MipNerF 360 仓库的 convert.py 脚本"""
    
    def __init__(self, 
                colmap_executable: str = "",
                magick_executable: str = "",
                progress_callback: Optional[Callable] = None):
        # 与 convert.py 完全一致的命令设置
        self.colmap_command = f'"{colmap_executable}"' if len(colmap_executable) > 0 else "colmap"
        self.magick_command = f'"{magick_executable}"' if len(magick_executable) > 0 else "magick"
        self.progress_callback = progress_callback
        self.logger = logging.getLogger(__name__)
        
    async def process_images(self, 
                           source_path: str,
                           options: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理图像生成点云 - 完全按照 convert.py 的逻辑
        
        Args:
            source_path: 源图像文件夹路径（对应 convert.py 的 --source_path）
            options: 处理选项
        
        Returns:
            处理结果字典
        """
        try:
            # 获取参数，与 convert.py 的参数名完全一致
            no_gpu = options.get('no_gpu', False)
            skip_matching = options.get('skip_matching', False)
            camera = options.get('camera_model', 'OPENCV')  # 对应 convert.py 的 --camera
            resize = options.get('resize', False)
            
            # 与 convert.py 一致的 GPU 设置
            use_gpu = 1 if not no_gpu else 0
            
            await self._update_progress(5, "开始 COLMAP 处理")
            
            # 确保输入文件夹存在图像
            input_path = os.path.join(source_path, "input")
            if not os.path.exists(input_path):
                raise ValueError(f"输入文件夹不存在: {input_path}")
            
            if not skip_matching:
                await self._update_progress(10, "创建目录结构")
                # 与 convert.py 完全一致：创建 distorted/sparse 目录
                os.makedirs(os.path.join(source_path, "distorted", "sparse"), exist_ok=True)
                
                await self._update_progress(20, "开始特征提取")
                # Feature extraction - 与 convert.py 完全一致的命令
                feat_extraction_cmd = (
                    f'{self.colmap_command} feature_extractor '
                    f'--database_path {source_path}/distorted/database.db '
                    f'--image_path {source_path}/input '
                    f'--ImageReader.single_camera 1 '
                    f'--ImageReader.camera_model {camera} '
                    f'--SiftExtraction.use_gpu {use_gpu}'
                )
                
                exit_code = await self._run_system_command(feat_extraction_cmd)
                if exit_code != 0:
                    raise RuntimeError(f"Feature extraction failed with code {exit_code}")
                
                await self._update_progress(40, "特征提取完成，开始特征匹配")
                # Feature matching - 与 convert.py 完全一致的命令
                feat_matching_cmd = (
                    f'{self.colmap_command} exhaustive_matcher '
                    f'--database_path {source_path}/distorted/database.db '
                    f'--SiftMatching.use_gpu {use_gpu}'
                )
                
                exit_code = await self._run_system_command(feat_matching_cmd)
                if exit_code != 0:
                    raise RuntimeError(f"Feature matching failed with code {exit_code}")
                
                await self._update_progress(60, "特征匹配完成，开始束调整")
                mapper_cmd = (
                    f'{self.colmap_command} mapper '
                    f'--database_path {source_path}/distorted/database.db '
                    f'--image_path {source_path}/input '
                    f'--output_path {source_path}/distorted/sparse '
                    f'--Mapper.ba_global_function_tolerance=0.000001'
                )
                
                exit_code = await self._run_system_command(mapper_cmd)
                if exit_code != 0:
                    raise RuntimeError(f"Mapper failed with code {exit_code}")
            
            await self._update_progress(75, "束调整完成，开始图像去畸变")
            # Image undistortion - 与 convert.py 完全一致的命令和注释
            # We need to undistort our images into ideal pinhole intrinsics.
            img_undist_cmd = (
                f'{self.colmap_command} image_undistorter '
                f'--image_path {source_path}/input '
                f'--input_path {source_path}/distorted/sparse/0 '
                f'--output_path {source_path} '
                f'--output_type COLMAP'
            )
            
            exit_code = await self._run_system_command(img_undist_cmd)
            if exit_code != 0:
                raise RuntimeError(f"Image undistorter failed with code {exit_code}")
            
            await self._update_progress(85, "图像去畸变完成，整理文件")
            # 文件整理 - 与 convert.py 完全一致的逻辑
            await self._organize_sparse_files(source_path)
            
            await self._update_progress(90, "文件整理完成")
            
            # 可选的图像缩放 - 与 convert.py 完全一致
            if resize:
                await self._update_progress(92, "开始生成多分辨率图像")
                await self._resize_images(source_path)
                await self._update_progress(98, "多分辨率图像生成完成")
            
            await self._update_progress(100, "COLMAP 处理完成")
            
            return {
                "success": True,
                "output_path": source_path,
                "message": "COLMAP 处理完成"
            }
            
        except Exception as e:
            self.logger.error(f"COLMAP 处理失败: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": f"COLMAP 处理失败: {str(e)}"
            }
    
    async def _organize_sparse_files(self, source_path: str):
        """整理 sparse 文件 - 与 convert.py 完全一致的逻辑"""
        sparse_path = os.path.join(source_path, "sparse")
        sparse_0_path = os.path.join(sparse_path, "0")
        
        if not os.path.exists(sparse_path):
            return
            
        files = os.listdir(sparse_path)
        os.makedirs(sparse_0_path, exist_ok=True)
        
        # Copy each file from the source directory to the destination directory
        for file in files:
            if file == '0':
                continue
            source_file = os.path.join(sparse_path, file)
            destination_file = os.path.join(sparse_0_path, file)
            if os.path.isfile(source_file):
                shutil.move(source_file, destination_file)
    
    async def _resize_images(self, source_path: str):
        """生成多分辨率图像 - 与 convert.py 完全一致的逻辑"""
        print("Copying and resizing...")
        
        # Resize images - 与 convert.py 完全一致的目录创建
        os.makedirs(os.path.join(source_path, "images_2"), exist_ok=True)
        os.makedirs(os.path.join(source_path, "images_4"), exist_ok=True)
        os.makedirs(os.path.join(source_path, "images_8"), exist_ok=True)
        
        # Get the list of files in the source directory
        images_path = os.path.join(source_path, "images")
        if not os.path.exists(images_path):
            return
            
        files = os.listdir(images_path)
        
        # Copy each file from the source directory to the destination directory
        for file in files:
            source_file = os.path.join(images_path, file)
            if not os.path.isfile(source_file):
                continue
            
            # 50% resize - 与 convert.py 完全一致
            destination_file = os.path.join(source_path, "images_2", file)
            shutil.copy2(source_file, destination_file)
            exit_code = await self._run_system_command(
                f'{self.magick_command} mogrify -resize 50% "{destination_file}"'
            )
            if exit_code != 0:
                raise RuntimeError(f"50% resize failed with code {exit_code}")
            
            # 25% resize - 与 convert.py 完全一致
            destination_file = os.path.join(source_path, "images_4", file)
            shutil.copy2(source_file, destination_file)
            exit_code = await self._run_system_command(
                f'{self.magick_command} mogrify -resize 25% "{destination_file}"'
            )
            if exit_code != 0:
                raise RuntimeError(f"25% resize failed with code {exit_code}")
            
            # 12.5% resize - 与 convert.py 完全一致
            destination_file = os.path.join(source_path, "images_8", file)
            shutil.copy2(source_file, destination_file)
            exit_code = await self._run_system_command(
                f'{self.magick_command} mogrify -resize 12.5% "{destination_file}"'
            )
            if exit_code != 0:
                raise RuntimeError(f"12.5% resize failed with code {exit_code}")
    
    async def _run_system_command(self, cmd: str) -> int:
        """运行系统命令 - 与 convert.py 使用 os.system 一致"""
        self.logger.info(f"执行命令: {cmd}")
        
        # 使用 asyncio 版本的 os.system
        process = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            self.logger.error(f"命令执行失败: {stderr.decode()}")
        
        return process.returncode
    
    async def _update_progress(self, progress: int, message: str):
        """更新进度"""
        if self.progress_callback:
            await self.progress_callback(progress, message)