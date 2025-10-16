import os
import cv2
from pathlib import Path
from typing import List, Optional
from fastapi import UploadFile, HTTPException
import tempfile

from datetime import datetime
import json
class VideoFrameExtractor:
    """视频帧提取器"""
    
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.supported_formats = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v', '.ogg']
    
    async def extract_frames(
        self, 
        video_file: UploadFile, 
        frame_rate: Optional[int] = None,
        extract_all: bool = False,
        custom_folder: Optional[str] = None
    ) -> dict:
        """
        从视频中提取帧
        
        Args:
            video_file: 上传的视频文件
            frame_rate: 目标帧率 (fps)
            extract_all: 是否提取所有帧
            custom_folder: 自定义输出文件夹名称
        
        Returns:
            包含提取信息的字典
        """
        
        # 验证文件格式
        file_extension = Path(video_file.filename).suffix.lower()
        if file_extension not in self.supported_formats:
            raise HTTPException(
                status_code=400, 
                detail=f"不支持的视频格式: {file_extension}"
            )
        
        # 创建临时文件保存上传的视频
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_video_path = temp_file.name
            
            # 保存上传的视频到临时文件
            content = await video_file.read()
            temp_file.write(content)
        
        try:
            # 创建输出文件夹
            if custom_folder:
                folder_name = custom_folder
            else:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                video_name = Path(video_file.filename).stem
                folder_name = f"{video_name}_{timestamp}_frames"
            
            output_folder = self.output_dir / folder_name
            output_folder.mkdir(parents=True, exist_ok=True)
            
            # 使用OpenCV处理视频
            cap = cv2.VideoCapture(temp_video_path)
            
            if not cap.isOpened():
                raise HTTPException(status_code=400, detail="无法打开视频文件")
            
            # 获取视频信息
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            original_fps = cap.get(cv2.CAP_PROP_FPS)
            duration = total_frames / original_fps if original_fps > 0 else 0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                      
            if extract_all:
                # 提取所有帧
                frame_interval = 1
                target_fps = original_fps
            else:
                # 根据指定帧率计算帧间隔
                target_fps = frame_rate or 5
                frame_interval = max(1, int(original_fps / target_fps))
            
            frame_count = 0
            saved_count = 0
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # 根据帧间隔决定是否保存当前帧
                if frame_count % frame_interval == 0:
                    # 生成帧文件名
                    timestamp_ms = int((frame_count / original_fps) * 1000)
                    frame_filename = f"frame_{saved_count:06d}_{timestamp_ms:08d}ms.jpg"
                    frame_path = output_folder / frame_filename
                    
                    # 保存帧
                    cv2.imwrite(str(frame_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
                    saved_count += 1
                
                frame_count += 1
            
            cap.release()
            
            # 生成提取信息
            extraction_info = {
                "video_filename": video_file.filename,
                "output_folder": folder_name,
                "total_video_frames": total_frames,
                "extracted_frames": saved_count,
                "original_fps": round(original_fps, 2),
                "target_fps": target_fps,
                "duration_seconds": round(duration, 2),
                "frame_interval": frame_interval,
                "extract_all_frames": extract_all,
                "video_resolution": f"{width}x{height}",
                "extraction_timestamp": datetime.now().isoformat()
            }
            
            # 保存提取信息到JSON文件
            info_file = output_folder / "extraction_info.json"
            with open(info_file, 'w', encoding='utf-8') as f:
                json.dump(extraction_info, f, indent=2, ensure_ascii=False)
            
            return extraction_info
            
        finally:
            # 清理临时文件
            if os.path.exists(temp_video_path):
                os.unlink(temp_video_path)
    
    async def batch_extract_frames(
        self, 
        video_files: List[UploadFile], 
        frame_rate: int = 5,
        custom_folder: Optional[str] = None
    ) -> dict:
        """
        批量提取视频帧
        
        Args:
            video_files: 视频文件列表
            frame_rate: 目标帧率
            custom_folder: 自定义文件夹名称
        
        Returns:
            批量处理结果
        """
        
        if custom_folder:
            batch_folder = self.output_dir / custom_folder
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            batch_folder = self.output_dir / f"batch_video_frames_{timestamp}"
        
        batch_folder.mkdir(parents=True, exist_ok=True)
        
        results = []
        total_extracted = 0
        
        for i, video_file in enumerate(video_files):
            try:
                # 为每个视频创建子文件夹
                video_name = Path(video_file.filename).stem
                video_folder = batch_folder / f"{i+1:02d}_{video_name}"
                
                # 临时修改输出目录
                original_output_dir = self.output_dir
                self.output_dir = batch_folder.parent
                
                result = await self.extract_frames(
                    video_file=video_file,
                    frame_rate=frame_rate,
                    extract_all=False,
                    custom_folder=video_folder.name
                )
                
                results.append({
                    "video_index": i + 1,
                    "video_filename": video_file.filename,
                    "status": "success",
                    "extraction_info": result
                })
                
                total_extracted += result["extracted_frames"]
                
                # 恢复原始输出目录
                self.output_dir = original_output_dir
                
            except Exception as e:
                results.append({
                    "video_index": i + 1,
                    "video_filename": video_file.filename,
                    "status": "error",
                    "error": str(e)
                })
        
        # 生成批量处理摘要
        batch_summary = {
            "batch_folder": batch_folder.name,
            "total_videos": len(video_files),
            "successful_extractions": len([r for r in results if r["status"] == "success"]),
            "failed_extractions": len([r for r in results if r["status"] == "error"]),
            "total_frames_extracted": total_extracted,
            "target_frame_rate": frame_rate,
            "processing_timestamp": datetime.now().isoformat(),
            "results": results
        }
        
        # 保存批量处理摘要
        summary_file = batch_folder / "batch_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(batch_summary, f, indent=2, ensure_ascii=False)
        
        return batch_summary

def get_video_info(video_path: str) -> dict:
    """获取视频基本信息"""
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        return {"error": "无法打开视频文件"}
    
    info = {
        "total_frames": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        "fps": cap.get(cv2.CAP_PROP_FPS),
        "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        "duration": 0
    }
    
    if info["fps"] > 0:
        info["duration"] = info["total_frames"] / info["fps"]
    
    cap.release()
    return info