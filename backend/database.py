from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# 创建 data 目录（如果不存在）
data_dir = Path(__file__).parent / "data"
data_dir.mkdir(exist_ok=True)

# 使用绝对路径
SQLALCHEMY_DATABASE_URL = f"sqlite:///{data_dir}/user.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()