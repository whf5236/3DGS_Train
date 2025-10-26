from fastapi import APIRouter, UploadFile, File, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
import os
from pathlib import Path
from ..services import file_service
from ..core.deps import get_db
from ..core.config import settings

router = APIRouter(prefix="/files", tags=["Files"])

@router.get("/get_files")
def get_files(
    stage: str = Query(..., description="阶段类型: image, colmap, pcd"),
    username: Optional[str] = Query(None, description="用户名"),
    db: Session = Depends(get_db)
):
    """
    获取指定用户在指定阶段的文件和文件夹列表
    
    参数:
        - stage: 阶段类型 (image, colmap, pcd)
        - username: 用户名（可选，不传则返回所有用户）
    
    返回:
        - files: 文件列表
        - folders: 文件夹列表
        - stage: 当前阶段
        - username: 当前用户
        - base_path: 基础路径（用于调试）
    """
    try:
        # 1. 构建路径：data/{username}/{stage}/
        base_path = _get_stage_path(stage, username)
        
        # 2. 检查路径是否存在
        if not os.path.exists(base_path):
            return {
                "files": [],
                "folders": [],
                "stage": stage,
                "username": username,
                "base_path": base_path,
                "message": f"路径不存在: {base_path}"
            }
        
        files = []
        folders = []
        
        # 3. 遍历目录，分别处理文件和文件夹
        for item in os.listdir(base_path):
            item_path = os.path.join(base_path, item)
            
            if os.path.isdir(item_path):
                # 处理文件夹
                folder_info = _get_folder_info(item, item_path, stage)
                folders.append(folder_info)
            else:
                # 处理文件
                file_info = _get_file_info(item, item_path, stage)
                files.append(file_info)
        
        # 4. 返回结果
        return {
            "files": files,
            "folders": folders,
            "stage": stage,
            "username": username,
            "base_path": base_path,
            "total_files": len(files),
            "total_folders": len(folders)
        }
        
    except Exception as e:
        import traceback
        return {
            "files": [],
            "folders": [],
            "stage": stage,
            "username": username,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

def _get_stage_path(stage: str, username: Optional[str] = None) -> str:
    """根据阶段和用户获取对应的路径"""

    
    # 使用配置中的上传基础目录，与上传服务保持一致
    base_dir = str(settings.upload_base_dir)  # "data"
    
    if username:
        user_dir = os.path.join(base_dir, username)
    else:
        user_dir = base_dir
    
    # 根据阶段确定子目录（与 settings.stage_mapping 保持一致）
    stage_mapping = settings.stage_mapping
    
    stage_dir = stage_mapping.get(stage, stage)
    return os.path.join(user_dir, stage_dir)

def _get_file_info(filename: str, filepath: str, stage: str) -> dict:
    """获取文件信息"""
    stat = os.stat(filepath)
    file_ext = Path(filename).suffix.lower()
    
    # 根据扩展名确定文件类型和分类
    category = _get_file_category(file_ext)
    file_type = _get_file_type(file_ext)
    
    return {
        "name": filename,
        "path": filepath,
        "type": file_type,
        "size": stat.st_size,
        "created_time": int(stat.st_ctime),
        "item_type": "file",
        "extension": file_ext,
        "category": category,  # 文件分类：image, video, archive, pointcloud, other
        "stage": stage,  # 所属阶段：images, colmap, pcd
        "folder": os.path.dirname(filepath)
    }

def _get_folder_info(foldername: str, folderpath: str, stage: str) -> dict:
    """获取文件夹信息"""
    stat = os.stat(folderpath)
    
    # 统计图片数量
    image_count = _count_images_in_folder(folderpath)
    
    # 根据阶段确定文件夹分类
    category = _get_folder_category(stage)
    
    return {
        "name": foldername,
        "type": "folder",
        "image_count": image_count,
        "has_images": image_count > 0,  # 是否包含图片
        "created_time": int(stat.st_ctime),
        "item_type": "folder",
        "category": category,  # 文件夹分类：images, colmap, pcd
        "stage": stage  # 所属阶段
    }

def _get_file_category(file_ext: str) -> str:
    """根据文件扩展名确定分类"""
    image_exts = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp'}
    video_exts = {'.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'}
    archive_exts = {'.zip', '.rar', '.7z', '.tar', '.gz'}
    pointcloud_exts = {'.ply', '.pcd', '.xyz', '.las', '.laz'}
    
    if file_ext in image_exts:
        return "image"
    elif file_ext in video_exts:
        return "video"
    elif file_ext in archive_exts:
        return "archive"
    elif file_ext in pointcloud_exts:
        return "pointcloud"
    else:
        return "other"

def _get_file_type(file_ext: str) -> str:
    """根据文件扩展名确定文件类型描述"""
    type_mapping = {
        '.jpg': 'JPEG图片', '.jpeg': 'JPEG图片', '.png': 'PNG图片',
        '.bmp': 'BMP图片', '.tiff': 'TIFF图片', '.tif': 'TIFF图片',
        '.mp4': 'MP4视频', '.avi': 'AVI视频', '.mov': 'MOV视频',
        '.ply': 'PLY点云', '.pcd': 'PCD点云', '.xyz': 'XYZ点云',
        '.zip': 'ZIP压缩包', '.rar': 'RAR压缩包'
    }
    return type_mapping.get(file_ext, f'{file_ext.upper()}文件')

def _get_folder_category(stage: str) -> str:
    """根据阶段确定文件夹分类"""
    stage_mapping = {
        "image": "images",
        "colmap": "colmap", 
        "pcd": "pcd"
    }
    return stage_mapping.get(stage, "images")

def _count_images_in_folder(folderpath: str) -> int:
    """统计文件夹中的图片数量"""
    image_exts = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp'}
    count = 0
    
    try:
        for item in os.listdir(folderpath):
            if Path(item).suffix.lower() in image_exts:
                count += 1
    except:
        pass
    
    return count