from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from .config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 绑定全局密钥配置
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM

def hash_password(password: str) -> str:
    password = password.encode('utf-8')[:72].decode('utf-8')
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # 确保密码长度不超过72字节
    plain_password = plain_password.encode('utf-8')[:72].decode('utf-8')
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: int = 30):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire})
    encoded = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded

def verify_token(token: str):
    """验证JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise Exception("Invalid token")