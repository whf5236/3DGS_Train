from typing import List, Optional, Dict, Any, Union
from pathlib import Path
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import tempfile
import os

import logging

from ..core.config import settings
from ..core.upload_config import UploadPolicyConfig
from ..utils.file_util import validate_file_size, ensure_dir
from ..services import file_service

logger = logging.getLogger(__name__)

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    logger.warning("OpenCV (cv2) not available. Video frame extraction will not work.")

class UploadResult:
    """上传结果封装"""
    def __init__(self):
        self.success_files: List[Dict[str, Any]] = []
        self.failed_files: List[Dict[str, str]] = []
        self.total_count: int = 0
        self.success_count: int = 0
        self.failed_count: int = 0
        self.upload_path: Optional[Path] = None
        self.metadata: Dict[str, Any] = {}

    def add_success(self, file_info: Dict[str, Any]):
        self.success_files.append(file_info)
        self.success_count += 1

    def add_failure(self, filename: str, error: str):
        self.failed_files.append({"filename": filename, "error": error})
        self.failed_count += 1

    def set_metadata(self, **kwargs):
        self.metadata.update(kwargs)

class FileUploadService:
    """统一的文件上传服务"""
    
    def __init__(self):
        self.base_upload_dir = Path(settings.upload_base_dir)
        
    def _create_upload_path(self, username: str, stage: str, custom_folder: Optional[str] = None) -> Path:
        """创建上传路径"""
        # 标准化阶段名称
        stage = settings.stage_mapping.get(stage, stage)
        
        if stage not in settings.valid_stages:
            raise HTTPException(status_code=400, detail=f"不支持的阶段: {stage}")
        
        # 构建基础路径
        base_path = self.base_upload_dir / username / stage
        
        # 如果有自定义文件夹，添加到路径中
        if custom_folder and custom_folder.strip():
            base_path = base_path / custom_folder.strip()
        
        # 确保目录存在
        ensure_dir(str(base_path))
        return base_path


    def _extract_video_frames(
        self,
        video_path: Path,
        output_folder: Path,
        extract_all_frames: bool = False,
        frame_rate: int = 5
    ) -> int:
        """
        从视频中提取帧
        
        Args:
            video_path: 视频文件路径
            output_folder: 输出文件夹路径
            extract_all_frames: 是否提取所有帧
            frame_rate: 每秒提取的帧数（当extract_all_frames为False时使用）
            
        Returns:
            提取的帧数
        """
        if not CV2_AVAILABLE:
            raise HTTPException(status_code=500, detail="OpenCV未安装，无法提取视频帧")
        
        ensure_dir(str(output_folder))
        
        # 打开视频文件
        video = cv2.VideoCapture(str(video_path))
        if not video.isOpened():
            raise HTTPException(status_code=400, detail=f"无法打开视频文件: {video_path.name}")
        
        try:
            # 获取视频信息
            fps = video.get(cv2.CAP_PROP_FPS)
            total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
            
            logger.info(f"视频信息 - FPS: {fps}, 总帧数: {total_frames}")
            
            frame_count = 0
            saved_count = 0
            
            # 计算帧间隔
            if extract_all_frames:
                frame_interval = 1
            else:
                frame_interval = max(1, int(fps / frame_rate))
            
            while True:
                ret, frame = video.read()
                if not ret:
                    break
                
                # 判断是否保存当前帧
                if frame_count % frame_interval == 0:
                    # 生成帧文件名，格式: frame_000001.jpg
                    frame_filename = f"frame_{saved_count:06d}.jpg"
                    frame_path = output_folder / frame_filename
                    
                    # 保存帧
                    cv2.imwrite(str(frame_path), frame)
                    saved_count += 1
                
                frame_count += 1
            
            logger.info(f"成功提取 {saved_count} 帧，共处理 {frame_count} 帧")
            return saved_count
            
        finally:
            video.release()
    
    def _is_video_file(self, filename: str) -> bool:
        """判断是否为视频文件"""
        video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.ogg', '.3gp'}
        ext = Path(filename).suffix.lower()
        return ext in video_extensions
    
    async def upload_files(
        self,
        files: Union[UploadFile, List[UploadFile]],
        username: str,
        db: Session,
        owner_id: int,
        stage: Optional[str] = None,
        final_folder_name: Optional[str] = None,
        upload_type: Optional[str] = None,
        extract_all_frames: bool = False,
        frame_rate: int = 5
    ) -> UploadResult:
        result = UploadResult()
        
        # 统一处理为列表
        if isinstance(files, UploadFile):
            file_list = [files]
        else:
            file_list = files
            
        if not file_list:
            raise HTTPException(status_code=400, detail="请选择要上传的文件")
        
        result.total_count = len(file_list)
        
        try:
            # 确定上传阶段，如果未指定则使用默认值
            if stage is None:
                stage = "images"
            
            # 标准化阶段名称
            stage = UploadPolicyConfig.normalize_stage(stage)
            logger.info(f"上传阶段: {stage}")
            
            # 创建上传路径（使用最终文件夹名）
            upload_path = self._create_upload_path(username, stage, final_folder_name)
            result.upload_path = upload_path
            logger.info(f"上传路径: {upload_path}, 文件夹: {final_folder_name}")
            
            # 处理所有文件
            for file in file_list:
                try:
                    if not file.filename:
                        raise ValueError("文件名不能为空")
                    
                    # 读取文件内容
                    file_content = await file.read()
                    
                    # 验证文件大小
                    validate_file_size(file_content)
                    
                    # 保存文件
                    file_path = upload_path / file.filename
                    with open(file_path, "wb") as f:
                        f.write(file_content)
                    
                    # 创建数据库记录
                    file_record = file_service.create_file_record(
                        db=db,
                        filename=file.filename,
                        path=str(file_path),
                        owner_id=owner_id
                    )
                    
                    # 添加成功记录
                    result.add_success({
                        "file_record": {
                            "id": file_record.id,
                            "name": file_record.name,
                            "path": file_record.path,
                            "owner_id": file_record.owner_id
                        },
                        "file_info": {
                            "filename": file.filename,
                            "size": len(file_content),
                            "path": str(file_path)
                        }
                    })
                    
                    # 如果是视频文件且upload_type为video，进行帧提取
                    if upload_type == 'video' and self._is_video_file(file.filename):
                        logger.info(f"检测到视频文件 {file.filename}，开始提取帧")
                        
                        # 生成帧保存文件夹名称，格式参照图片上传逻辑
                        # 格式: {username}_images_{timestamp} 或 {finalFolderName}_frames_{timestamp}
                        timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
                        if final_folder_name:
                            frames_folder_name = f"{final_folder_name}_frames_{timestamp}"
                        else:
                            frames_folder_name = f"{username}_images_{timestamp}"
                        
                        # 创建帧保存路径，保存到images阶段下
                        frames_output_path = self._create_upload_path(
                            username=username,
                            stage='images',
                            custom_folder=frames_folder_name
                        )
                        
                        try:
                            # 提取视频帧
                            extracted_count = self._extract_video_frames(
                                video_path=file_path,
                                output_folder=frames_output_path,
                                extract_all_frames=extract_all_frames,
                                frame_rate=frame_rate
                            )
                            
                            # 为每个提取的帧创建数据库记录
                            for frame_file in frames_output_path.glob("frame_*.jpg"):
                                frame_record = file_service.create_file_record(
                                    db=db,
                                    filename=frame_file.name,
                                    path=str(frame_file),
                                    owner_id=owner_id
                                )
                            
                            logger.info(f"视频 {file.filename} 成功提取 {extracted_count} 帧到 {frames_output_path}")
                            result.metadata['frames_extracted'] = extracted_count
                            result.metadata['frames_folder'] = frames_folder_name
                            result.metadata['frames_path'] = str(frames_output_path)
                            
                        except Exception as e:
                            logger.error(f"提取视频帧失败: {str(e)}")
                            # 帧提取失败不影响视频文件的上传
                            result.metadata['frame_extraction_error'] = str(e)
                    
                except Exception as e:
                    result.add_failure(file.filename or "unknown", str(e))
                    continue
            
            # 设置元数据
            result.set_metadata(
                stage=stage,
                username=username,
                upload_path=str(upload_path),
                final_folder_name=final_folder_name
            )
            
            return result
            
        except Exception as e:
            logger.error(f"批量上传失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")
    


# 创建全局实例
upload_service = FileUploadService()