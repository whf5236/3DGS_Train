import os
from pathlib import Path
from typing import Optional, Set
from fastapi import HTTPException, UploadFile
from ..core.config import settings

def ensure_dir(path: str):
    """确保目录存在"""
    if not os.path.exists(path):
        os.makedirs(path)

def create_upload_path(username: str, stage: str, custom_folder_name: Optional[str] = None) -> Path:
    
    normalized_stage = normalize_stage(stage)

    if normalized_stage not in settings.valid_stages:
        raise HTTPException(
            status_code=400, 
            detail=f"无效的阶段: {stage}。支持的阶段: {', '.join(settings.valid_stages)}"
        )
    
    # 构建路径: data/username/stage/
    upload_path = settings.upload_base_dir / username / normalized_stage
    upload_path.mkdir(parents=True, exist_ok=True)
    
    # 如果有自定义文件夹名称，在阶段目录下创建子文件夹
    if custom_folder_name and custom_folder_name.strip():
        upload_path = upload_path / custom_folder_name.strip()
        upload_path.mkdir(parents=True, exist_ok=True)
    
    return upload_path

def normalize_stage(stage: str) -> str:
    return settings.stage_mapping.get(stage, stage)

def validate_file(file: UploadFile, allowed_types: Set[str]) -> None:
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")
    
    if not file.content_type or file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"不支持的文件类型: {file.content_type}。支持的类型: {', '.join(allowed_types)}"
        )

def validate_file_size(content: bytes, max_size: int = None) -> None:
    max_size = max_size or settings.max_file_size
    if len(content) > max_size:
        raise HTTPException(
            status_code=400, 
            detail=f"文件大小超过限制 ({max_size // (1024*1024)}MB)"
        )

