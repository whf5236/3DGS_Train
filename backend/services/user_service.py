from sqlalchemy.orm import Session
from ..models import user_model
from ..core.security import hash_password, verify_password, create_access_token
from fastapi import HTTPException, status

def create_user(db: Session, username: str, password: str, email: str):
    existing = db.query(user_model.User).filter_by(username=username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    hashed = hash_password(password)
    user = user_model.User(username=username, email=email, hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, username: str, password: str):
    user = db.query(user_model.User).filter_by(username=username).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": username})
    return {"access_token": token, "token_type": "bearer"}

def get_user_by_username(db: Session, username: str):
    """根据用户名获取用户"""
    return db.query(user_model.User).filter_by(username=username).first()
