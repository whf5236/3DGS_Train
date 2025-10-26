import os
from dotenv import load_dotenv
from ..database import SessionLocal
from pathlib import Path
# 加载环境变量
load_dotenv()

class Settings:
    DB_URL = os.getenv("DB_URL", "sqlite:///./data/user.db")
    SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 120
    
    # File Upload Configuration
    upload_base_dir = Path("data")
    max_file_size = 1000 * 1024 * 1024
    
    # Valid stages for file organization
    valid_stages = {"images", "colmap", "pcd"}
    
    # Stage mapping for backward compatibility
    stage_mapping = {
        "image": "images",
        "colmap": "colmap", 
        "pcd": "pcd"
    }
    
    # Allowed file types (MIME types)
    allowed_image_types = {
        "image/jpeg", "image/jpg", "image/png", "image/gif", 
        "image/bmp", "image/webp", "image/tiff"
    }
    
    allowed_video_types = {
        "video/mp4", "video/avi", "video/quicktime", "video/x-msvideo",
        "video/x-matroska", "video/x-ms-wmv", "video/x-flv"
    }
    
    def __init__(self):
        """初始化时创建必要的目录"""
        # 确保上传基础目录存在
        self.upload_base_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ 上传目录已就绪: {self.upload_base_dir.absolute()}")

settings = Settings()


        