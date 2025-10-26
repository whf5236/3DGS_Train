from enum import Enum
from typing import Dict, List, Optional, Set
from dataclasses import dataclass
from datetime import datetime


class UploadStrategy(Enum):
    """上传策略枚举"""
    AUTO_DETECT = "auto_detect"  # 自动检测
    SMART = "smart"              # 智能模式
    MANUAL = "manual"            # 手动模式


@dataclass
class FileClassificationRule:
    """文件分类规则"""
    extensions: Set[str]        # 文件扩展名集合
    target_stage: str          # 目标阶段
    priority: int              # 优先级（数字越小优先级越高）
    description: str           # 规则描述


class UploadPolicyConfig:
    """简化的上传策略配置类"""
    
    # 默认阶段映射
    DEFAULT_STAGE_MAPPING = {
        'image': 'images',
        'images': 'images',
        'video': 'images',
        'colmap': 'colmap',
        'pcd': 'gaussian',
        'pointcloud': 'gaussian',
        'gaussian': 'gaussian',
        'splat': 'gaussian',
        'folder': 'images'
    }
    
    @classmethod
    def generate_auto_folder_name(cls, stage: str, file_count: int = 1) -> str:
        """生成自动文件夹名称"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if file_count == 1:
            return f"{stage}_{timestamp}"
        else:
            return f"{stage}_batch_{file_count}files_{timestamp}"
    
    @classmethod
    def normalize_stage(cls, stage: Optional[str]) -> str:
        """标准化阶段名称"""
        if not stage:
            return 'images'
        
        # 使用映射表标准化
        normalized = cls.DEFAULT_STAGE_MAPPING.get(stage.lower(), stage.lower())
        
        # 确保返回的是有效阶段
        valid_stages = {'images', 'colmap', 'gaussian'}
        return normalized if normalized in valid_stages else 'images'
    
    # 文件分类规则（按优先级排序）
    CLASSIFICATION_RULES = [
        FileClassificationRule(
            extensions={'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp'},
            target_stage='images',
            priority=1,
            description='图像文件'
        ),
        FileClassificationRule(
            extensions={'.bin', '.txt'},  # COLMAP相关文件
            target_stage='colmap',
            priority=2,
            description='COLMAP文件'
        ),
        FileClassificationRule(
            extensions={'.ply', '.pcd', '.xyz', '.las', '.laz'},
            target_stage='gaussian',
            priority=3,
            description='点云文件'
        ),
        FileClassificationRule(
            extensions={'.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv'},
            target_stage='images',  # 视频文件也归类到images阶段
            priority=4,
            description='视频文件'
        ),
        FileClassificationRule(
            extensions={'.zip', '.rar', '.7z', '.tar', '.gz'},
            target_stage='images',  # 压缩文件默认归类到images
            priority=5,
            description='压缩文件'
        )
    ]
    
    # 默认阶段映射
    DEFAULT_STAGE_MAPPING = {
        'image': 'images',
        'images': 'images',
        'colmap': 'colmap',
        'pcd': 'gaussian',
        'gaussian': 'gaussian',
        'point_cloud': 'gaussian'
    }
    
    # 阶段优先级（用于混合文件类型时的决策）
    STAGE_PRIORITY = {
        'images': 1,
        'colmap': 2,
        'gaussian': 3
    }
    
    @classmethod
    def get_stage_by_filename(cls, filename: str) -> Optional[str]:
        """根据文件名确定阶段"""
        if not filename:
            return None
            
        # 获取文件扩展名
        ext = '.' + filename.split('.')[-1].lower() if '.' in filename else ''
        
        # 查找匹配的规则
        for rule in cls.CLASSIFICATION_RULES:
            if ext in rule.extensions:
                return rule.target_stage
        
        return None
    
    @classmethod
    def get_best_stage_for_files(cls, filenames: List[str]) -> str:
        """为多个文件确定最合适的阶段"""
        if not filenames:
            return 'images'  # 默认阶段
        
        # 统计各阶段的文件数量
        stage_counts = {}
        for filename in filenames:
            stage = cls.get_stage_by_filename(filename)
            if stage:
                stage_counts[stage] = stage_counts.get(stage, 0) + 1
        
        if not stage_counts:
            return 'images'  # 如果没有识别出任何阶段，返回默认
        
        # 如果只有一种阶段，直接返回
        if len(stage_counts) == 1:
            return list(stage_counts.keys())[0]
        
        # 多种阶段时，选择优先级最高的
        best_stage = min(stage_counts.keys(), 
                        key=lambda x: cls.STAGE_PRIORITY.get(x, 999))
        
        return best_stage
    
    @classmethod
    def should_auto_create_folder(cls, strategy: UploadStrategy, 
                                 custom_folder: Optional[str] = None) -> bool:
        """判断是否应该自动创建文件夹"""
        if strategy == UploadStrategy.MANUAL:
            return False
        elif strategy == UploadStrategy.AUTO_DETECT:
            return custom_folder is None
        elif strategy == UploadStrategy.SMART:
            return True
        return False