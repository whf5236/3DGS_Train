from pathlib import Path
from typing import Dict, Set
from ..core.config import settings

class FileTypeManager:
    """文件类型管理器"""
    
    # 文件扩展名到类型的映射
    EXTENSION_TO_TYPE = {
        # 图片文件
        '.jpg': 'image', '.jpeg': 'image', '.png': 'image', 
        '.gif': 'image', '.bmp': 'image', '.webp': 'image',
        '.tiff': 'image', '.tif': 'image',
        
        # 视频文件
        '.mp4': 'video', '.avi': 'video', '.mov': 'video', 
        '.mkv': 'video', '.wmv': 'video', '.flv': 'video',
        
        # 点云文件
        '.ply': 'point_cloud', '.pcd': 'point_cloud', '.xyz': 'point_cloud',
        
        # COLMAP文件
        '.bin': 'colmap', '.txt': 'colmap',
        
        # 配置文件
        '.json': 'config', '.yaml': 'config', '.yml': 'config',
        '.xml': 'config', '.ini': 'config',
        
        # 压缩文件
        '.zip': 'archive', '.rar': 'archive', '.7z': 'archive',
        '.tar': 'archive', '.gz': 'archive'
    }
    
    # 类型到分类的映射
    TYPE_TO_CATEGORY = {
        'image': 'media',
        'video': 'media', 
        'point_cloud': 'data',
        'colmap': 'data',
        'config': 'config',
        'archive': 'archive'
    }
    
    @classmethod
    def get_file_type(cls, file_path: Path) -> str:
        """
        根据文件扩展名获取文件类型
        
        Args:
            file_path: 文件路径
            
        Returns:
            str: 文件类型
        """
        extension = file_path.suffix.lower()
        return cls.EXTENSION_TO_TYPE.get(extension, 'unknown')
    
    @classmethod
    def get_file_category(cls, file_path: Path) -> str:
        """
        获取文件分类
        
        Args:
            file_path: 文件路径
            
        Returns:
            str: 文件分类
        """
        file_type = cls.get_file_type(file_path)
        return cls.TYPE_TO_CATEGORY.get(file_type, 'other')
    
    @classmethod
    def is_image(cls, file_path: Path) -> bool:
        """检查是否为图片文件"""
        return cls.get_file_type(file_path) == 'image'
    
    @classmethod
    def is_video(cls, file_path: Path) -> bool:
        """检查是否为视频文件"""
        return cls.get_file_type(file_path) == 'video'
    
    @classmethod
    def is_point_cloud(cls, file_path: Path) -> bool:
        """检查是否为点云文件"""
        return cls.get_file_type(file_path) == 'point_cloud'
    
    @classmethod
    def is_media_file(cls, file_path: Path) -> bool:
        """检查是否为媒体文件（图片或视频）"""
        return cls.get_file_category(file_path) == 'media'
    
    @classmethod
    def get_allowed_types_for_stage(cls, stage: str) -> Set[str]:
        """
        根据阶段获取允许的文件类型
        
        Args:
            stage: 阶段名称
            
        Returns:
            Set[str]: 允许的MIME类型集合
        """
        if stage == 'images':
            return settings.allowed_image_types | settings.allowed_video_types
        elif stage == 'colmap':
            # COLMAP阶段允许各种数据文件
            return {'application/octet-stream', 'text/plain', 'application/json'}
        elif stage == 'gaussian':
            # 高斯阶段主要是点云文件
            return {'application/octet-stream', 'text/plain'}
        else:
            return set()
    
    @classmethod
    def get_file_info_with_type(cls, file_path: Path) -> Dict:
        """
        获取包含类型信息的文件详情
        
        Args:
            file_path: 文件路径
            
        Returns:
            Dict: 文件信息字典
        """
        if not file_path.exists():
            return {}
        
        stat = file_path.stat()
        file_type = cls.get_file_type(file_path)
        category = cls.get_file_category(file_path)
        
        return {
            "name": file_path.name,
            "size": stat.st_size,
            "modified": stat.st_mtime,
            "is_file": file_path.is_file(),
            "extension": file_path.suffix.lower(),
            "path": str(file_path),
            "type": file_type,
            "category": category,
            "is_media": cls.is_media_file(file_path)
        }