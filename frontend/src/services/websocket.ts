import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

export interface WebSocketMessage {
  type: string
  [key: string]: any
}

export interface WebSocketConfig {
  url: string
  token?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

class WebSocketService {
  private ws: WebSocket | null = null
  private config: WebSocketConfig
  private reconnectAttempts = 0
  private heartbeatTimer: number | null = null
  private reconnectTimer: number | null = null
  
  // 响应式状态
  public isConnected = ref(false)
  public isConnecting = ref(false)
  public lastError = ref<string | null>(null)
  public messageHistory = reactive<WebSocketMessage[]>([])
  
  // 事件监听器
  private listeners: Map<string, Function[]> = new Map()
  
  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config
    }
  }
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve()
        return
      }
      
      this.isConnecting.value = true
      this.lastError.value = null
      
      try {
        const wsUrl = this.config.token 
          ? `${this.config.url}?token=${this.config.token}`
          : this.config.url
          
        this.ws = new WebSocket(wsUrl)
        
        this.ws.onopen = () => {
          this.isConnected.value = true
          this.isConnecting.value = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('解析WebSocket消息失败:', error)
          }
        }
        
        this.ws.onclose = (event) => {
          console.log('WebSocket连接已关闭:', event.code, event.reason)
          this.isConnected.value = false
          this.isConnecting.value = false
          this.stopHeartbeat()
          
          if (event.code !== 1000) { // 非正常关闭
            this.attemptReconnect()
          }
        }
        
        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error)
          this.lastError.value = 'WebSocket连接错误'
          this.isConnecting.value = false
          reject(error)
        }
        
      } catch (error) {
        this.isConnecting.value = false
        this.lastError.value = '创建WebSocket连接失败'
        reject(error)
      }
    })
  }
  
  disconnect() {
    this.stopHeartbeat()
    this.clearReconnectTimer()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    
    this.isConnected.value = false
    this.isConnecting.value = false
  }
  
  send(message: WebSocketMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket未连接，无法发送消息:', message.type)
      // 可以选择将消息加入队列，等待连接后发送
      return false
    }
    
    try {
      this.ws.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('发送WebSocket消息失败:', error)
      return false
    }
  }
  
  // 事件监听
  on(type: string, callback: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type)!.push(callback)
  }
  
  off(type: string, callback?: Function) {
    if (!this.listeners.has(type)) return
    
    if (callback) {
      const callbacks = this.listeners.get(type)!
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    } else {
      this.listeners.delete(type)
    }
  }
  
  private handleMessage(message: WebSocketMessage) {
    console.log('收到WebSocket消息:', message)
    
    // 添加到消息历史
    this.messageHistory.push({
      ...message,
      timestamp: Date.now()
    })
    
    // 限制历史消息数量
    if (this.messageHistory.length > 100) {
      this.messageHistory.splice(0, this.messageHistory.length - 100)
    }
    
    // 触发对应的监听器
    const callbacks = this.listeners.get(message.type) || []
    callbacks.forEach(callback => {
      try {
        callback(message)
      } catch (error) {
        console.error('WebSocket消息处理器错误:', error)
      }
    })
    
    // 处理特定消息类型
    switch (message.type) {
      case 'connection':
        if (message.status === 'connected') {
          ElMessage.success('WebSocket连接成功')
        }
        break
        
      case 'error':
        ElMessage.error(message.message || 'WebSocket错误')
        break
        
      case 'file_upload_status':
        this.handleFileUploadStatus(message)
        break
    }
  }
  
  private handleFileUploadStatus(message: WebSocketMessage) {
    switch (message.status) {
      case 'started':
        ElMessage.info(`开始上传文件: ${message.filename}`)
        break
      case 'progress':
        // 可以在这里更新上传进度
        break
      case 'completed':
        ElMessage.success(`文件上传完成: ${message.filename}`)
        break
      case 'failed':
        ElMessage.error(`文件上传失败: ${message.filename}`)
        break
    }
  }
  
  private startHeartbeat() {
    this.stopHeartbeat()
    
    if (this.config.heartbeatInterval) {
      this.heartbeatTimer = window.setInterval(() => {
        this.send({
          type: 'ping',
          timestamp: Date.now()
        })
      }, this.config.heartbeatInterval)
    }
  }
  
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
  
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.log('达到最大重连次数，停止重连')
      ElMessage.error('WebSocket连接失败，请刷新页面重试')
      return
    }
    
    this.reconnectAttempts++
    console.log(`尝试重连 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`)
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(() => {
        // 重连失败，会自动再次尝试
      })
    }, this.config.reconnectInterval)
  }
  
  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

// 创建全局WebSocket实例
let wsService: WebSocketService | null = null

export function useWebSocket(token?: string) {
  if (!wsService) {
    wsService = new WebSocketService({
      url: 'ws://localhost:8000/ws',
      token
    })
  }
  
  return wsService
}

export { WebSocketService }