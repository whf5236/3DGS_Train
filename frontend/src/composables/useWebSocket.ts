import { onMounted, onUnmounted, watch } from 'vue'
import { useWebSocket, type WebSocketMessage } from '@/services/websocket'
import { useUserStore } from '@/stores/userStore'

export function useWebSocketConnection() {
  const userStore = useUserStore()
  const ws = useWebSocket(userStore.token || undefined)
  
  // 自动连接和断开
  onMounted(async () => {
    if (userStore.isAuthenticated) {
      try {
        await ws.connect()
      } catch (error) {
        console.error('WebSocket连接失败:', error)
      }
    }
  })
  
  onUnmounted(() => {
    ws.disconnect()
  })
  
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

export function useFileUploadWebSocket() {
  const { ws, isConnected } = useWebSocketConnection()
  
  // 订阅文件上传事件（等待连接建立）
  const subscribeToFileUploads = async () => {
    // 如果已经连接，直接发送
    if (isConnected.value) {
      ws.send({
        type: 'subscribe_file_changes'
      })
      return
    }
    
    // 如果未连接，等待连接建立
    return new Promise<void>((resolve) => {
      const unwatch = watch(isConnected, (connected) => {
        if (connected) {
          ws.send({
            type: 'subscribe_file_changes'
          })
          unwatch() // 停止监听
          resolve()
        }
      }, { immediate: true })
    })
  }
  
  // 通知文件上传开始（检查连接状态）
  const notifyUploadStart = (filename: string) => {
    if (isConnected.value) {
      ws.send({
        type: 'file_upload_start',
        filename
      })
    } else {
      console.warn('WebSocket未连接，无法发送上传开始通知:', filename)
    }
  }
  
  // 监听文件上传状态
  const onUploadStatus = (callback: (message: WebSocketMessage) => void) => {
    ws.on('file_upload_status', callback)
    return () => ws.off('file_upload_status', callback)
  }
  
  return {
    subscribeToFileUploads,
    notifyUploadStart,
    onUploadStatus,
    isConnected: ws.isConnected
  }
}