from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from typing import List, Optional
from pathlib import Path
from datetime import datetime
import shutil
import os
import json
from ..websocket.manager import manager
from .video_frame_extraction import VideoFrameExtractor

router = APIRouter(prefix="/upload", tags=["Upload"])

BASE_DIR = Path(__file__).resolve().parent.parent
NOT_PROCESSED_DIR = BASE_DIR / "data" / "not_processed"
NOT_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload_images")
async def upload_images(
    files: List[UploadFile] = File(...), 
    username: str = Form(...),
    custom_folder_name: Optional[str] = Form(None),
    upload_component: str = Form("image")  # 上传组件类型：image, video, document等
):
    """上传图片文件到指定的文件夹结构"""
    try:
        # 创建时间戳
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 确定最终文件夹名称
        if custom_folder_name and custom_folder_name.strip():
            final_folder_name = custom_folder_name.strip()
        else:
            # 默认名称：用户名_上传组件_时间戳
            final_folder_name = f"{username}_{upload_component}_{timestamp}"
        
        # 创建文件夹结构：not_processed/{username}/{upload_component}/{final_folder_name}
        user_folder = NOT_PROCESSED_DIR / username
        component_folder = user_folder / upload_component
        target_folder = component_folder / final_folder_name
        
        # 确保所有文件夹都存在
        target_folder.mkdir(parents=True, exist_ok=True)
        
        uploaded_files = []
        
        # 通过WebSocket通知上传开始
        await manager.broadcast_json({
            "type": "upload_batch_started",
            "username": username,
            "upload_component": upload_component,
            "folder_name": final_folder_name,
            "target_path": str(target_folder.relative_to(NOT_PROCESSED_DIR)),
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
                    "path": str(file_path.relative_to(NOT_PROCESSED_DIR)),
                    "size": len(content),
                    "folder_structure": {
                        "username": username,
                        "component": upload_component,
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
                        "path": str(file_path.relative_to(NOT_PROCESSED_DIR)),
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
            "upload_component": upload_component,
            "folder_name": final_folder_name,
            "target_path": str(target_folder.relative_to(NOT_PROCESSED_DIR)),
            "uploaded_count": len(uploaded_files),
            "files": uploaded_files
        })
        
        # 通知文件列表更新
        await manager.broadcast_json({
            "type": "file_list_updated",
            "action": "files_added",
            "username": username,
            "component": upload_component,
            "folder_name": final_folder_name,
            "files": uploaded_files
        })
        
        return {
            "message": f"成功上传 {len(uploaded_files)} 个文件",
            "folder_structure": {
                "username": username,
                "component": upload_component,
                "folder_name": final_folder_name,
                "full_path": str(target_folder.relative_to(NOT_PROCESSED_DIR))
            },
            "files": uploaded_files,
            "upload_info": {
                "timestamp": timestamp,
                "custom_name_used": bool(custom_folder_name and custom_folder_name.strip())
            }
        }
        
    except Exception as e:
        # 通过WebSocket通知批量上传失败
        await manager.broadcast_json({
            "type": "upload_batch_failed",
            "username": username,
            "upload_component": upload_component,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")

@router.get("/files")
async def get_files(username: str):
    try:
        files = []
        folders = []
        processed_folders = []
        # 确保目录存在
        if not NOT_PROCESSED_DIR.exists():
            return {
                "files": files,
                "folders": folders,
                "processed_folders": processed_folders
            }    
        # 检查用户目录是否存在
        user_dir = NOT_PROCESSED_DIR / username
        if not user_dir.exists():
            return {
                "files": files,
                "folders": folders,
                "processed_folders": processed_folders
            }
        
        # 扫描用户目录下的组件文件夹（images, point_cloud, etc.）
        for component_dir in user_dir.iterdir():
            if component_dir.is_dir():
                for project_dir in component_dir.iterdir():
                    if project_dir.is_dir():
                        # 统计文件夹中的图片数量（递归统计）
                        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'}
                        image_files = []
                        
                        def count_images(folder_path: Path):
                            try:
                                for sub_item in folder_path.iterdir():
                                    if sub_item.is_file() and sub_item.suffix.lower() in image_extensions:
                                        image_files.append(sub_item)
                                    elif sub_item.is_dir():
                                        count_images(sub_item)
                            except PermissionError:
                                pass  # 跳过无权限访问的文件夹
                        
                        count_images(project_dir)
                        
                        # 判断文件夹类型
                        folder_type = "general"
                        if image_files:
                            folder_type = "images"
                        
                        # 检查是否是点云文件夹
                        pointcloud_extensions = {'.ply', '.pcd', '.xyz', '.pts', '.las', '.laz', '.obj', '.splat'}
                        pointcloud_files = []
                        try:
                            for sub_item in project_dir.rglob('*'):
                                if sub_item.is_file() and sub_item.suffix.lower() in pointcloud_extensions:
                                    pointcloud_files.append(sub_item)
                        except PermissionError:
                            pass  # 跳过无权限访问的文件夹
                        
                        if pointcloud_files:
                            folder_type = "point_cloud"
                        
                        folder_info = {
                            "name": project_dir.name,
                            "path": str(project_dir.relative_to(NOT_PROCESSED_DIR)),
                            "type": folder_type,
                            "has_images": len(image_files) > 0,
                            "image_count": len(image_files),
                            "created_time": int(project_dir.stat().st_mtime),
                            "item_type": "folder"
                        }
                        folders.append(folder_info)
                    elif project_dir.is_file():
                        # 处理组件文件夹中的直接文件
                        file_info = {
                            "name": project_dir.name,
                            "path": str(project_dir.relative_to(NOT_PROCESSED_DIR)),
                            "type": project_dir.suffix.lower().lstrip('.') if project_dir.suffix else 'unknown',
                            "size": project_dir.stat().st_size,
                            "created_time": int(project_dir.stat().st_mtime),
                            "item_type": "file"
                        }
                        files.append(file_info)
            elif component_dir.is_file():
                # 处理用户目录下的直接文件
                file_info = {
                    "name": component_dir.name,
                    "path": str(component_dir.relative_to(NOT_PROCESSED_DIR)),
                    "type": component_dir.suffix.lower().lstrip('.') if component_dir.suffix else 'unknown',
                    "size": component_dir.stat().st_size,
                    "created_time": int(component_dir.stat().st_mtime),
                    "item_type": "file"
                }
                files.append(file_info)
        
        return {
            "files": files,
            "folders": folders,
            "processed_folders": processed_folders
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文件列表失败: {str(e)}")

@router.get("/files/{folder_name}")
async def get_folder_files(folder_name: str):
    """获取指定文件夹内的文件列表"""
    try:
        folder_path = NOT_PROCESSED_DIR / folder_name
        
        if not folder_path.exists() or not folder_path.is_dir():
            raise HTTPException(status_code=404, detail="文件夹不存在")
        
        files = []
        for item in folder_path.iterdir():
            if item.is_file():
                file_info = {
                    "name": item.name,
                    "path": str(item.relative_to(NOT_PROCESSED_DIR)),
                    "type": item.suffix.lower(),
                    "size": item.stat().st_size,
                    "folder": folder_name,
                    "created_time": int(item.stat().st_ctime),
                    "item_type": "file"
                }
                files.append(file_info)
        
        return {"files": files}
        
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
        
        # 创建用户目录结构
        user_folder = NOT_PROCESSED_DIR / username
        video_folder = user_folder / "video"
        target_folder = video_folder / final_folder_name
        
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

@router.post("/batch_videos_with_frame_extraction")
async def batch_upload_videos_with_frame_extraction(
    files: List[UploadFile] = File(...),
    username: str = Form(...),
    frame_rate: Optional[int] = Form(5),
    folder_name: Optional[str] = Form(None)
):
    """批量上传视频并提取帧"""
    try:
        if not files:
            raise HTTPException(status_code=400, detail="没有上传文件")
        
        # 创建输出目录
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if folder_name and folder_name.strip():
            final_folder_name = folder_name.strip()
        else:
            final_folder_name = f"{username}_batch_video_{timestamp}"
        
        # 创建用户目录结构
        user_folder = NOT_PROCESSED_DIR / username
        video_folder = user_folder / "video"
        target_folder = video_folder / final_folder_name
        
        target_folder.mkdir(parents=True, exist_ok=True)
        
        # 保存所有原始视频文件
        for video_file in files:
            video_path = target_folder / video_file.filename
            with open(video_path, "wb") as f:
                content = await video_file.read()
                f.write(content)
        
        # 初始化帧提取器
        extractor = VideoFrameExtractor(target_folder)
        
        # 批量提取帧
        batch_result = await extractor.batch_extract_frames(
            video_files=files,
            frame_rate=frame_rate,
            custom_folder=f"{final_folder_name}_frames"
        )
        
        # 通过WebSocket通知批量处理完成
        await manager.broadcast_json({
            "type": "batch_video_frame_extraction_completed",
            "username": username,
            "folder_name": final_folder_name,
            "batch_result": batch_result
        })
        
        return {
            "message": "批量视频上传并帧提取成功",
            "folder_name": final_folder_name,
            "processed_count": batch_result["successful_extractions"],
            "total_count": batch_result["total_videos"],
            "batch_summary": batch_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量视频处理失败: {str(e)}")

@router.get("/video_info/{video_filename}")
async def get_video_information(video_filename: str, username: str):
    """获取视频文件信息"""
    try:
        from .video_frame_extraction import get_video_info
        
        # 查找视频文件
        user_folder = NOT_PROCESSED_DIR / username
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
        # 构建文件夹路径
        user_folder = NOT_PROCESSED_DIR / username / "video" / folder_name
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
                    "path": str(file_path.relative_to(NOT_PROCESSED_DIR)),
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
            "frames_folder": str(frames_folder.relative_to(NOT_PROCESSED_DIR))
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取视频帧失败: {str(e)}")

@router.get("/frame_image/{file_path:path}")
async def get_frame_image(file_path: str):
    """获取具体的帧图片文件"""
    try:
        # 构建完整文件路径
        full_path = NOT_PROCESSED_DIR / file_path
        
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