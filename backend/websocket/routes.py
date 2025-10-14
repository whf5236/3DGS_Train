from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from .manager import manager
from ..auth.utils import verify_token
import json
from typing import Optional

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    """WebSocket连接端点"""
    user_id = None
    
    # 如果提供了token，验证用户身份
    if token:
        try:
            payload = verify_token(token)
            user_id = payload.get("sub")
        except Exception as e:
            await websocket.close(code=1008, reason="Invalid token")
            return
    
    await manager.connect(websocket, user_id)
    
    try:
        # 发送连接成功消息
        await manager.send_personal_json({
            "type": "connection",
            "status": "connected",
            "user_id": user_id,
            "message": "WebSocket连接已建立"
        }, websocket)
        
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await handle_websocket_message(message, websocket, user_id)
            except json.JSONDecodeError:
                await manager.send_personal_json({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        print(f"用户 {user_id} 断开连接")

async def handle_websocket_message(message: dict, websocket: WebSocket, user_id: str):
    """处理WebSocket消息"""
    message_type = message.get("type")
    
    if message_type == "ping":
        # 心跳检测
        await manager.send_personal_json({
            "type": "pong",
            "timestamp": message.get("timestamp")
        }, websocket)
        
    elif message_type == "file_upload_start":
        # 文件上传开始
        await manager.send_personal_json({
            "type": "file_upload_status",
            "status": "started",
            "filename": message.get("filename"),
            "message": "文件上传开始"
        }, websocket)
        
    elif message_type == "subscribe_file_changes":
        # 订阅文件变化
        await manager.send_personal_json({
            "type": "subscription",
            "status": "subscribed",
            "topic": "file_changes",
            "message": "已订阅文件变化通知"
        }, websocket)
        
    else:
        await manager.send_personal_json({
            "type": "error",
            "message": f"Unknown message type: {message_type}"
        }, websocket)