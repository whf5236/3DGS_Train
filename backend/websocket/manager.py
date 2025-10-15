from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import json
import asyncio
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        # 存储活跃的WebSocket连接
        self.active_connections: List[WebSocket] = []
        # 存储用户ID与连接的映射
        self.user_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str = None):
        """接受WebSocket连接"""
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            self.user_connections[user_id] = websocket
        print(f"WebSocket连接已建立，当前连接数: {len(self.active_connections)}")
        
    def disconnect(self, websocket: WebSocket, user_id: str = None):
        """断开WebSocket连接"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id and user_id in self.user_connections:
            del self.user_connections[user_id]
        
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """发送个人消息"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            print(f"发送个人消息失败: {e}")
            
    async def send_personal_json(self, data: Dict[Any, Any], websocket: WebSocket):
        """发送个人JSON消息"""
        try:
            await websocket.send_json(data)
        except Exception as e:
            print(f"发送个人JSON消息失败: {e}")
            
    async def broadcast(self, message: str):
        """广播消息给所有连接"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"广播消息失败: {e}")
                disconnected.append(connection)
        
        # 清理断开的连接
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
                
    async def broadcast_json(self, data: Dict[Any, Any]):
        """广播JSON消息给所有连接"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception as e:
                print(f"广播JSON消息失败: {e}")
                disconnected.append(connection)
        
        # 清理断开的连接
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
                
    async def send_to_user(self, user_id: str, data: Dict[Any, Any]):
        """发送消息给特定用户"""
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_json(data)
            except Exception as e:
                print(f"发送用户消息失败: {e}")
                # 清理断开的连接
                del self.user_connections[user_id]

# 全局连接管理器实例
manager = ConnectionManager()