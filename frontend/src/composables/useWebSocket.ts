import { onMounted, onUnmounted, watch } from 'vue'
import { useWebSocket, type WebSocketMessage } from '@/services/websocket'
import { useUserStore } from '@/stores/userStore'

export function useWebSocketConnection() {
  const userStore = useUserStore()
  const ws = useWebSocket(userStore.token || undefined)
  
  // 监听认证状态变化
  watch(() => userStore.isAuthenticated, async (isAuth) => {
    if (isAuth) {
      try {
        await ws.connect()
      } catch (error) {
        console.error('WebSocket连接失败:', error)
      }
    } else {
      ws.disconnect()
    }
  })
  
  return {
    ws,
    isConnected: ws.isConnected,
    isConnecting: ws.isConnecting,
    lastError: ws.lastError,
    messageHistory: ws.messageHistory
  }
}

export function usePointCloudWebSocket() {
  const { ws, isConnected } = useWebSocketConnection()
  
  // 订阅点云处理任务状态更新
  const subscribeToTaskUpdates = async (taskId: string) => {
    // 如果已经连接，直接发送
    if (isConnected.value) {
      ws.send({
        type: 'subscribe_point_cloud_task',
        task_id: taskId
      })
      return
    }
    
    // 如果未连接，等待连接建立
    return new Promise<void>((resolve) => {
      const unwatch = watch(isConnected, (connected) => {
        if (connected) {
          ws.send({
            type: 'subscribe_point_cloud_task',
            task_id: taskId
          })
          unwatch() // 停止监听
          resolve()
        }
      }, { immediate: true })
    })
  }
  
  // 取消订阅点云处理任务
  const unsubscribeFromTaskUpdates = (taskId: string) => {
    if (isConnected.value) {
      ws.send({
        type: 'unsubscribe_point_cloud_task',
        task_id: taskId
      })
    }
  }
  
  // 监听点云处理任务状态
  const onTaskStatusUpdate = (callback: (message: WebSocketMessage) => void) => {
    ws.on('point_cloud_task_status', callback)
    return () => ws.off('point_cloud_task_status', callback)
  }
  
  // 监听点云处理完成事件
  const onProcessingComplete = (callback: (message: WebSocketMessage) => void) => {
    ws.on('point_cloud_processing_complete', callback)
    return () => ws.off('point_cloud_processing_complete', callback)
  }
  
  // 通知开始点云处理
  const notifyProcessingStart = (folderName: string, taskId: string) => {
    if (isConnected.value) {
      ws.send({
        type: 'point_cloud_processing_start',
        folder_name: folderName,
        task_id: taskId
      })
    } else {
      console.warn('WebSocket未连接，无法发送处理开始通知:', folderName)
    }
  }
  
  return {
    subscribeToTaskUpdates,
    unsubscribeFromTaskUpdates,
    onTaskStatusUpdate,
    onProcessingComplete,
    notifyProcessingStart,
    isConnected: ws.isConnected
  }
}