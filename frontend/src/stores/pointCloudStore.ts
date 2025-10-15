import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { eventBus } from '@/utils/eventBus'
import type { WebSocketMessage } from '@/services/websocket'
import { usePointCloudWebSocket } from '@/composables/useWebSocket'

// 类型定义
export interface FolderInfo {
  name: string
  has_images: boolean
  image_count?: number
  created_time?: number
}

export interface ProcessingTask {
  task_id: string
  status: 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  message: string
  folder_name: string
  processing_time?: number
  output_folder?: string
}

export interface ProcessingResult {
  task_id?: string
  name: string
  source_path?: string
  status: 'completed' | 'failed' | 'cancelled' | 'unknown'
  processing_time?: number
  timestamp?: number
}

export interface ResultFile {
  name: string
  size: number
  modified: number
}

export interface ProcessingOptions {
  resize: boolean
}

export const usePointCloudStore = defineStore('pointCloud', {
  state: () => ({
    // 文件夹数据
    folders: [] as FolderInfo[],
    loading: false,
    loadingResults: false,
    error: null as string | null,
    
    // 选择状态
    selectedFolder: null as string | null,
    selectedFolderDetails: null as FolderInfo | null,
    
    // 处理状态
    processingFolder: null as string | null,
    currentTask: null as ProcessingTask | null,
    
    // WebSocket 状态
    wsService: null as {
      subscribeToTaskUpdates: (taskId: string) => Promise<void>
      unsubscribeFromTaskUpdates: (taskId: string) => void
      onTaskStatusUpdate: (callback: (message: WebSocketMessage) => void) => () => void
      onProcessingComplete: (callback: (message: WebSocketMessage) => void) => () => void
      notifyProcessingStart: (folderName: string, taskId: string) => void
      isConnected: any
    } | null,
    wsConnected: false,
    
    // 处理选项
    processingOptions: {
      resize: true
    } as ProcessingOptions,
    
    // 处理历史
    results: [] as ProcessingResult[],
    
    // 结果对话框
    resultsDialogVisible: false,
    currentResultFiles: [] as ResultFile[],
    selectedResultFolder: ''
  }),

  getters: {
    isProcessing: (state) => {
      return state.currentTask && state.currentTask.status === 'processing'
    },
    
    hasActiveFolders: (state) => {
      return state.folders.length > 0
    },
    
    processingProgress: (state) => {
      return state.currentTask?.progress || 0
    },
    
    isWebSocketConnected: (state) => {
      return state.wsConnected
    }
  },

  actions: {
    // 获取文件夹列表
    async fetchFolders(refresh: boolean = false) {
      this.loading = true
      this.error = null

      try {
        // 动态导入 userStore 避免循环依赖
        const { useUserStore } = await import('./userStore')
        const userStore = useUserStore()
        
        if (!userStore.isAuthenticated) {
          throw new Error('用户未登录')
        }
        
        const username = userStore.user?.username
        if (!username) {
          throw new Error('用户名不存在')
        }
        
        const response = await api.get(`/api/folders/${username}`)
        
        // 过滤出包含图片的文件夹
        this.folders = response.data.folders.filter((folder: FolderInfo) => folder.has_images) || []
      } catch (error: any) {
        this.error = error.message || 'Failed to load folders. Please try again.'
        console.error('Error fetching folders:', error)
      } finally {
        this.loading = false
      }
    },

    // 获取处理历史
    async fetchResults() {
      this.loadingResults = true

      try {
        const { useUserStore } = await import('./userStore')
        const userStore = useUserStore()
        
        if (!userStore.isAuthenticated) {
          throw new Error('用户未登录')
        }
        
        const username = userStore.user?.username
        if (!username) {
          throw new Error('用户名不存在')
        }
        
        const response = await api.get(`/point-cloud/results?username=${username}`)
        this.results = response.data.results || []
      } catch (error: any) {
        console.error('Error fetching results:', error)
      } finally {
        this.loadingResults = false
      }
    },

    // 选择文件夹
    selectFolder(folder: FolderInfo) {
      this.selectedFolder = folder.name
      this.selectedFolderDetails = folder
    },

    // 取消选择
    cancelSelection() {
      this.selectedFolder = null
      this.selectedFolderDetails = null
    },

    // 开始处理
    async startProcessing(folderName: string) {
      try {
        const { useUserStore } = await import('./userStore')
        const userStore = useUserStore()
        
        if (!userStore.isAuthenticated) {
          throw new Error('用户未登录')
        }
        
        const username = userStore.user?.username
        if (!username) {
          throw new Error('用户名不存在')
        }
        
        // 确保 WebSocket 已连接
        await this.ensureWebSocketConnection()
        
        this.processingFolder = folderName
        
        const response = await api.post(
          `/point-cloud/process?username=${username}`,
          { folder_name: folderName }
        )

        // 设置当前任务
        this.currentTask = {
          task_id: response.data.task_id,
          status: 'processing',
          progress: 0,
          message: 'Starting point cloud processing...',
          folder_name: folderName
        }
        
        // 通过 WebSocket 订阅任务状态更新
        await this.subscribeToTaskUpdates(response.data.task_id)
      } catch (error: any) {
        console.error('Error starting processing:', error)
        this.processingFolder = null
        this.error = 'Failed to start processing. Please try again.'
        throw error
      }
    },

    // 确保 WebSocket 连接
    async ensureWebSocketConnection() {
      if (!this.wsService) {
        this.wsService = usePointCloudWebSocket()
      }
      
      this.wsConnected = true
      
      // 设置 WebSocket 消息监听器
      this.setupWebSocketListeners()
    },

    // 设置 WebSocket 消息监听器
    setupWebSocketListeners() {
      if (!this.wsService) return
      
      // 监听点云处理任务状态更新
      this.wsService.onTaskStatusUpdate((message: WebSocketMessage) => {
        this.handleTaskStatusUpdate(message)
      })
      
      // 监听点云处理完成事件
      this.wsService.onProcessingComplete((message: WebSocketMessage) => {
        this.handleProcessingComplete(message)
      })
    },

    // 订阅任务状态更新
    async subscribeToTaskUpdates(taskId: string) {
      if (!this.wsService) {
        console.warn('WebSocket 服务未初始化')
        return
      }
      
      try {
        await this.wsService.subscribeToTaskUpdates(taskId)
        console.log(`已订阅任务 ${taskId} 的状态更新`)
      } catch (error) {
        console.error('订阅任务状态更新失败:', error)
      }
    },

    // 处理自动处理请求
    handleAutoProcess(data: { folder_name: string }) {
      if (data && data.folder_name) {
        // 自动选择并处理指定的文件夹
        const folder = this.folders.find(f => f.name === data.folder_name)
        if (folder) {
          this.selectFolder(folder)
          this.startProcessing(folder.name)
        }
      }
    },

    // 清理资源
    cleanup() {
      // WebSocket 连接由 composable 管理，这里只需要清理本地状态
      this.wsService = null
      this.wsConnected = false
      this.currentTask = null
      this.processingFolder = null
    },

    // 处理任务状态更新
    handleTaskStatusUpdate(message: WebSocketMessage) {
      if (!this.currentTask || this.currentTask.task_id !== message.task_id) {
        return
      }
      
      // 更新任务状态
      this.currentTask = {
        ...this.currentTask,
        status: message.status,
        progress: message.progress || this.currentTask.progress,
        message: message.message || this.currentTask.message,
        processing_time: message.processing_time,
        output_folder: message.output_folder
      }
      
      // 如果任务已完成或失败，处理后续逻辑
      if (['completed', 'failed', 'cancelled'].includes(message.status)) {
        this.fetchResults()
        
        // 通知其他组件刷新文件夹列表
        eventBus.emit('refresh-folders')
        
        // 如果处理成功完成，发出事件通知训练组件
        if (message.status === 'completed') {
          eventBus.emit('point-cloud-processed', {
            folder_name: this.processingFolder || '',
            output_folder: message.output_folder,
            status: 'completed'
          })
        }
      }
    },

    // 处理点云处理完成事件
    handleProcessingComplete(message: WebSocketMessage) {
      console.log('点云处理完成:', message)
      
      // 刷新文件夹列表和结果
      this.fetchFolders()
      this.fetchResults()
      
      // 显示完成消息
      if (message.status === 'completed') {
        ElMessage.success(`点云处理完成: ${message.folder_name}`)
      } else if (message.status === 'failed') {
        ElMessage.error(`点云处理失败: ${message.folder_name}`)
      }
    },

    // 添加缺失的方法
    cancelTask() {
      if (this.currentTask) {
        this.currentTask.status = 'cancelled'
        this.currentTask = null
        this.processingFolder = null
      }
    },

    resetTask() {
      this.currentTask = null
      this.processingFolder = null
      this.error = null
    },

    viewResultFiles(folderName: string) {
      this.selectedResultFolder = folderName
      this.resultsDialogVisible = true
      // 这里可以添加获取结果文件的逻辑
    },

    closeResultsDialog() {
      this.resultsDialogVisible = false
      this.selectedResultFolder = ''
      this.currentResultFiles = []
    },

    updateProcessingOptions(options: Partial<ProcessingOptions>) {
      this.processingOptions = { ...this.processingOptions, ...options }
    }
  }
})