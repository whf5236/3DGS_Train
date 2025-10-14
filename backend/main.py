from fastapi import FastAPI
from .database import Base, engine
from .auth.routes import router as auth_router
from .upload.routes import router as upload_router
from .websocket.routes import router as websocket_router
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI(title="后端已启动")

# 添加CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # 允许的前端源
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有 HTTP 方法
    allow_headers=["*"],  # 允许所有 headers
)

# 添加根路径处理
@app.get("/")
def read_root():
    return {"message": "后端已经启动"}

app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(websocket_router)
