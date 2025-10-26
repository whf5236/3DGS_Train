from fastapi import FastAPI
from .database import Base, engine
from .routers.auth import router as auth_router
from .routers.getfiles import router as files_router
from .routers.upload import router as upload_router
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI(title="后端已启动")

# 添加CORS配置 - 更全面的配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# 添加根路径处理
@app.get("/")
def read_root():
    return {"message": "后端已经启动"}

app.include_router(auth_router)
app.include_router(files_router)
app.include_router(upload_router)
