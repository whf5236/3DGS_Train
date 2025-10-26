from fastapi import APIRouter, UploadFile, File, Depends, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..services.upload_service import upload_service
from ..core.deps import get_db, get_current_user
from ..models.user_model import User

router = APIRouter(prefix="/upload", tags=["Files"])

@router.post("/")
async def upload_files(
    files: List[UploadFile] = File(...),
    stage: Optional[str] = Form(None),
    finalFolderName: Optional[str] = Form(None),
    upload_type: Optional[str] = Form(None),
    extract_all_frames: Optional[str] = Form(None),
    frame_rate: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # 处理视频帧提取参数
        extract_frames = extract_all_frames == 'true' if extract_all_frames else False
        fps = int(frame_rate) if frame_rate else 5
        
        result = await upload_service.upload_files(
            files=files,
            username=current_user.username,
            db=db,
            owner_id=current_user.id,
            stage=stage,
            final_folder_name=finalFolderName,
            upload_type=upload_type,
            extract_all_frames=extract_frames,
            frame_rate=fps
        )
        
        # 统一的响应格式
        if result.success_count > 0:
            return {
                "message": f"成功上传 {result.success_count} 个文件到 {result.metadata['stage']} 阶段",
                "uploaded_files": [item["file_record"] for item in result.success_files],
                "failed_files": result.failed_files,
                "file_details": [item["file_info"] for item in result.success_files],
                "folder_info": {
                    "target_path": result.metadata["upload_path"],
                    "stage": result.metadata["stage"],
                    "username": result.metadata["username"],
                    "final_folder_name": result.metadata.get("final_folder_name"),
                    "total_files": result.total_count,
                    "success_count": result.success_count,
                    "failed_count": result.failed_count,
                    "upload_type": upload_type
                }
            }
        else:
            error_msg = result.failed_files[0]["error"] if result.failed_files else "未知错误"
            raise HTTPException(status_code=400, detail=f"上传失败: {error_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")
