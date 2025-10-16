from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from typing import List, Optional
from pathlib import Path
from datetime import datetime
import os
import json
from ..websocket.manager import manager
from .video_frame_extraction import VideoFrameExtractor


router = APIRouter(prefix="/upload", tags=["Upload"])

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# 定义处理阶段文件夹映射
STAGE_FOLDERS = {
    "image": "image",      # 原始图像阶段
    "colmap": "colmap",    # COLMAP处理阶段
    "pcd": "pcd"           # 最终训练结果阶段
}

@router.post("/upload_images")
async def upload_images(
    files: List[UploadFile] = File(...), 
    username: str = Form(...),
    custom_folder_name: Optional[str] = Form(None),
    stage: str = Form("image")  # 处理阶段：image, colmap, pcd
):
    """上传图片文件到指定的文件夹结构"""
    try:
        # 验证处理阶段
        if stage not in STAGE_FOLDERS:
            raise HTTPException(status_code=400, detail=f"无效的处理阶段: {stage}，支持的阶段: {list(STAGE_FOLDERS.keys())}")
        
        # 创建时间戳
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 确定最终文件夹名称
        if custom_folder_name and custom_folder_name.strip():
            final_folder_name = custom_folder_name.strip()
        else:
            # 默认名称：阶段_时间戳
            final_folder_name = f"{stage}_{timestamp}"
        
        # 创建文件夹结构：data/{username}/{stage}/{final_folder_name}
        user_folder = DATA_DIR / username
        stage_folder = user_folder / STAGE_FOLDERS[stage]
        target_folder = stage_folder / final_folder_name
        
        # 确保所有文件夹都存在
        target_folder.mkdir(parents=True, exist_ok=True)
        
        uploaded_files = []
        
        # 通过WebSocket通知上传开始
        await manager.broadcast_json({
            "type": "upload_batch_started",
            "username": username,
            "stage": stage,
            "folder_name": final_folder_name,
            "target_path": str(target_folder.relative_to(DATA_DIR)),
            "file_count": len(files)
        })
        
        for file in files:
            # 通过WebSocket通知单个文件上传开始
            await manager.broadcast_json({
                "type": "file_upload_status",
                "status": "started",
                "filename": file.filename,
                "username": username,
                "target_folder": final_folder_name
            })
            
            try:
                # 保存文件到目标文件夹
                file_path = target_folder / file.filename
                with open(file_path, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)
                
                uploaded_files.append({
                    "filename": file.filename,
                    "path": str(file_path.relative_to(DATA_DIR)),
                    "size": len(content),
                    "folder_structure": {
                        "username": username,
                        "stage": stage,
                        "folder_name": final_folder_name
                    }
                })
                
                # 通过WebSocket通知单个文件上传完成
                await manager.broadcast_json({
                    "type": "file_upload_status",
                    "status": "completed",
                    "filename": file.filename,
                    "username": username,
                    "target_folder": final_folder_name,
                    "file_info": {
                        "filename": file.filename,
                        "path": str(file_path.relative_to(DATA_DIR)),
                        "size": len(content)
                    }
                })
                
            except Exception as e:
                # 通过WebSocket通知单个文件上传失败
                await manager.broadcast_json({
                    "type": "file_upload_status",
                    "status": "failed",
                    "filename": file.filename,
                    "username": username,
                    "target_folder": final_folder_name,
                    "error": str(e)
                })
                raise e
        
        # 通过WebSocket通知批量上传完成
        await manager.broadcast_json({
            "type": "upload_batch_completed",
            "username": username,
            "stage": stage,
            "folder_name": final_folder_name,
            "target_path": str(target_folder.relative_to(DATA_DIR)),
            "uploaded_count": len(uploaded_files),
            "files": uploaded_files
        })
        
        # 通知文件列表更新
        await manager.broadcast_json({
            "type": "file_list_updated",
            "action": "files_added",
            "username": username,
            "stage": stage,
            "folder_name": final_folder_name,
            "files": uploaded_files
        })
        
        return {
            "message": f"成功上传 {len(uploaded_files)} 个文件",
            "uploaded_files": uploaded_files,
            "folder_info": {
                "username": username,
                "stage": stage,
                "folder_name": final_folder_name,
                "target_path": str(target_folder.relative_to(DATA_DIR))
            }
        }
        
    except Exception as e:
        # 通过WebSocket通知批量上传失败
        await manager.broadcast_json({
            "type": "upload_batch_failed",
            "username": username,
            "stage": stage,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")

@router.get("/get_files")
async def get_files(username: str, stage: Optional[str] = None):
    """获取用户文件，可按处理阶段过滤"""
    try:
        files = []
        folders = []
        stage_folders = {}
        
        # 确保目录存在
        if not DATA_DIR.exists():
            return {
                "files": files,
                "folders": folders,
                "stage_folders": stage_folders
            }    
        
        # 检查用户目录是否存在
        user_dir = DATA_DIR / username
        if not user_dir.exists():
            return {
                "files": files,
                "folders": folders,
                "stage_folders": stage_folders
            }
        
        # 如果指定了处理阶段，只返回该阶段的文件
        if stage:
            if stage not in STAGE_FOLDERS:
                raise HTTPException(status_code=400, detail=f"无效的处理阶段: {stage}")
            
            stage_dir = user_dir / STAGE_FOLDERS[stage]
            if stage_dir.exists():
                folders = await _get_stage_folders(stage_dir, stage, username)
            
            return {
                "files": files,
                "folders": folders,
                "stage_folders": {stage: folders}
            }
        
        # 扫描所有处理阶段
        for stage_key, stage_folder_name in STAGE_FOLDERS.items():
            stage_dir = user_dir / stage_folder_name
            if stage_dir.exists():
                stage_folders[stage_key] = await _get_stage_folders(stage_dir, stage_key, username)
                folders.extend(stage_folders[stage_key])
        
        return {
            "files": files,
            "folders": folders,
            "stage_folders": stage_folders
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文件列表失败: {str(e)}")

@router.get("/get_folder_files/{username}/{stage}/{folder_name}")
async def get_folder_files(username: str, stage: str, folder_name: str):
    """获取指定文件夹内的文件列表"""
    try:
        # 验证处理阶段
        if stage not in STAGE_FOLDERS:
            raise HTTPException(status_code=400, detail=f"无效的处理阶段: {stage}")
        
        folder_path = DATA_DIR / username / STAGE_FOLDERS[stage] / folder_name
        
        if not folder_path.exists() or not folder_path.is_dir():
            raise HTTPException(status_code=404, detail="文件夹不存在")
        
        files = []
        for item in folder_path.iterdir():
            if item.is_file():
                file_info = {
                    "name": item.name,
                    "path": str(item.relative_to(DATA_DIR)),
                    "type": item.suffix.lower().lstrip('.') if item.suffix else 'unknown',
                    "size": item.stat().st_size,
                    "username": username,
                    "stage": stage,
                    "folder": folder_name,
                    "created_time": int(item.stat().st_ctime),
                    "modified_time": int(item.stat().st_mtime),
                    "item_type": "file"
                }
                files.append(file_info)
        
        return {
            "files": files,
            "folder_info": {
                "username": username,
                "stage": stage,
                "folder_name": folder_name,
                "path": str(folder_path.relative_to(DATA_DIR)),
                "total_files": len(files)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文件夹内容失败: {str(e)}")


@router.post("/videos_with_frame_extraction")
async def upload_video_with_frame_extraction(
    files: List[UploadFile] = File(...),
    username: str = Form(...),
    frame_rate: Optional[int] = Form(5),
    extract_all_frames: Optional[bool] = Form(False),
    folder_name: Optional[str] = Form(None)
):
    """上传视频并提取帧"""
    try:
        if not files:
            raise HTTPException(status_code=400, detail="没有上传文件")
        
        # 只处理第一个文件（单文件上传）
        video_file = files[0]
        
        # 创建输出目录
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if folder_name and folder_name.strip():
            final_folder_name = folder_name.strip()
        else:
            final_folder_name = f"{username}_video_{timestamp}"
        
        # 创建用户目录结构 - 视频帧提取后放入image阶段
        user_folder = DATA_DIR / username
        image_folder = user_folder / STAGE_FOLDERS["image"]
        target_folder = image_folder / final_folder_name
        
        target_folder.mkdir(parents=True, exist_ok=True)
        
        # 初始化帧提取器
        extractor = VideoFrameExtractor(target_folder)
        
        # 提取帧
        extraction_result = await extractor.extract_frames(
            video_file=video_file,
            frame_rate=frame_rate,
            extract_all=extract_all_frames,
            custom_folder="frames"
        )
        
        # 同时保存原始视频文件
        video_path = target_folder / video_file.filename
        with open(video_path, "wb") as f:
            await video_file.seek(0)  # 重置文件指针
            content = await video_file.read()
            f.write(content)
        
        # 通过WebSocket通知处理完成
        await manager.broadcast_json({
            "type": "video_frame_extraction_completed",
            "username": username,
            "folder_name": final_folder_name,
            "extraction_info": extraction_result
        })
        
        return {
            "message": "视频上传并帧提取成功",
            "folder_name": final_folder_name,
            "video_filename": video_file.filename,
            "extraction_info": extraction_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"视频处理失败: {str(e)}")

@router.get("/video_info/{video_filename}")
async def get_video_information(video_filename: str, username: str):
    """获取视频文件信息"""
    try:
        from .video_frame_extraction import get_video_info
        
        # 查找视频文件
        user_folder = DATA_DIR / username
        video_path = None
        
        # 在用户目录下搜索视频文件
        for root, dirs, files in os.walk(user_folder):
            if video_filename in files:
                video_path = os.path.join(root, video_filename)
                break
        
        if not video_path or not os.path.exists(video_path):
            raise HTTPException(status_code=404, detail="视频文件不存在")
        
        video_info = get_video_info(video_path)
        
        if "error" in video_info:
            raise HTTPException(status_code=400, detail=video_info["error"])
        
        return {
            "filename": video_filename,
            "info": video_info
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取视频信息失败: {str(e)}")

@router.get("/video_frames/{username}/{folder_name}")
async def get_video_frames(username: str, folder_name: str):
    """获取视频处理后的图片帧列表"""
    try:
        # 构建文件夹路径 - 视频帧现在存储在image阶段
        user_folder = DATA_DIR / username / STAGE_FOLDERS["image"] / folder_name
        frames_folder = user_folder / "frames"
        
        if not frames_folder.exists():
            # 尝试查找其他可能的帧文件夹
            for item in user_folder.iterdir():
                if item.is_dir() and "frame" in item.name.lower():
                    frames_folder = item
                    break
        
        if not frames_folder.exists():
            return {
                "frames": [],
                "extraction_info": None,
                "message": "未找到提取的帧文件"
            }
        
        # 获取所有图片文件
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
        frames = []
        
        for file_path in frames_folder.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in image_extensions:
                frames.append({
                    "filename": file_path.name,
                    "path": str(file_path.relative_to(DATA_DIR)),
                    "size": file_path.stat().st_size,
                    "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                })
        
        # 按文件名排序
        frames.sort(key=lambda x: x["filename"])
        
        # 读取提取信息
        extraction_info = None
        info_file = user_folder / "extraction_info.json"
        if info_file.exists():
            with open(info_file, 'r', encoding='utf-8') as f:
                extraction_info = json.load(f)
        
        return {
            "frames": frames,
            "extraction_info": extraction_info,
            "total_frames": len(frames),
            "frames_folder": str(frames_folder.relative_to(DATA_DIR))
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取视频帧失败: {str(e)}")

@router.get("/frame_image/{file_path:path}")
async def get_frame_image(file_path: str):
    """获取具体的帧图片文件"""
    try:
        # 构建完整文件路径
        full_path = DATA_DIR / file_path
        
        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(status_code=404, detail="图片文件不存在")
        
        # 验证文件类型
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
        if full_path.suffix.lower() not in image_extensions:
            raise HTTPException(status_code=400, detail="不是有效的图片文件")
        
        return FileResponse(
            path=str(full_path),
            media_type=f"image/{full_path.suffix[1:]}",
            filename=full_path.name
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取图片失败: {str(e)}")

async def _get_stage_folders(stage_dir: Path, stage: str, username: str):
    """获取指定阶段目录下的文件夹列表"""
    folders = []
    
    if not stage_dir.exists():
        return folders
    
    for item in stage_dir.iterdir():
        if item.is_dir():
            # 统计文件夹中的图片数量
            image_count = 0
            has_images = False
            for file_path in item.rglob("*"):
                if file_path.is_file():
                    file_ext = file_path.suffix.lower()
                    if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']:
                        image_count += 1
                        has_images = True
            
            # 根据阶段确定文件夹类别
            if stage == 'image':
                category = 'images'
            elif stage == 'colmap':
                category = 'colmap'
            elif stage == 'pcd':
                category = 'pcd'
            else:
                category = 'general'  # 默认类别
            
            folder_info = {
                "name": item.name,
                "type": "folder",
                "has_images": has_images,
                "image_count": image_count,
                "created_time": int(item.stat().st_ctime),
                "modified_time": int(item.stat().st_mtime),
                "item_type": "folder",
                "category": category,
                "stage": stage,
                "username": username,
                "path": str(item.relative_to(DATA_DIR))
            }
            folders.append(folder_info)
            print(f"DEBUG: Added folder: {folder_info['name']}, image_count: {folder_info['image_count']}")
    
    print(f"DEBUG: _get_stage_folders returning {len(folders)} folders")
    return folders


@router.post("/point-cloud/process")
async def process_point_cloud(
    username: str = Form(...),
    folder_name: str = Form(...)
):
    try:
        # 验证用户文件夹是否存在
        user_folder = DATA_DIR / username
        if not user_folder.exists():
            raise HTTPException(status_code=404, detail="用户文件夹不存在")
        
        # 验证源文件夹（image 阶段）是否存在
        source_folder = user_folder / "image" / folder_name
        if not source_folder.exists():
            raise HTTPException(status_code=404, detail=f"源文件夹不存在: {folder_name}")
        
        # 检查源文件夹是否包含图片
        image_files = []
        for file_path in source_folder.rglob("*"):
            if file_path.is_file():
                file_ext = file_path.suffix.lower()
                if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']:
                    image_files.append(file_path)
        
        if not image_files:
            raise HTTPException(status_code=400, detail="源文件夹中没有找到图片文件")
        
        # 创建目标文件夹（colmap 阶段）
        target_folder = user_folder / "colmap" / folder_name
        target_folder.mkdir(parents=True, exist_ok=True)
        
        # 生成任务 ID
        import uuid
        task_id = str(uuid.uuid4())
        

        # 通过 WebSocket 通知处理开始
        await manager.send_message_to_user(username, {
            "type": "point_cloud_processing_started",
            "task_id": task_id,
            "folder_name": folder_name,
            "status": "processing",
            "message": f"开始处理点云: {folder_name}"
        })
         
        return {
            "success": True,
            "message": "点云处理已启动",
            "task_id": task_id,
            "folder_name": folder_name,
            "source_path": str(source_folder),
            "target_path": str(target_folder)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动点云处理失败: {str(e)}")


