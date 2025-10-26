
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from ..database import SessionLocal
from jose import jwt, JWTError
from ..core.config import settings
from ..core.security import verify_token
from ..models.user_model import User
from ..services import user_service

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    authorization: str = Header(None), 
    db: Session = Depends(get_db)
) -> User:
    """获取当前认证用户"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Missing or invalid Authorization header"
        )
    
    token = authorization.split(" ", 1)[1]
    try:
        payload = verify_token(token)
        username = payload.get("sub")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid token payload"
            )
        
        # 从数据库获取用户信息
        user = user_service.get_user_by_username(db, username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="User not found"
            )
        
        return user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid token"
        )
