import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { eventBus } from '@/utils/eventBus'
import type { WebSocketMessage } from '@/services/websocket'
import { usePointCloudWebSocket } from '@/composables/useWebSocket'

// 类型定义 - 与 fileStore 的 FolderItem 兼容
export interface FolderInfo {
  name: string
  type: string
  image_count: number
  created_time: number
  item_type?: 'folder'
  category?: 'images' | 'point_cloud' | 'colmap' | 'general'
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
  // 基础选项
  output_folder_name: string
  resize: boolean
  camera_model: 'OPENCV' | 'PINHOLE' | 'RADIAL' | 'SIMPLE_RADIAL'
  
  // 高级选项
  no_gpu: boolean
  skip_matching: boolean
  
  // 可执行文件路径
  colmap_executable: string
  magick_executable: string
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
      // 基础选项
      output_folder_name: '',
      resize: true,
      camera_model: 'OPENCV',
      
      // 高级选项
      no_gpu: false,
      skip_matching: false,
      
      // 可执行文件路径
      colmap_executable: '',
      magick_executable: ''
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
    // 获取文件夹列表 - 获取 image 阶段的文件夹用于点云处理
    async fetchFolders(refresh: boolean = false) {
      this.loading = true
      this.error = null
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
        // 直接获取 image 阶段的文件夹，这些是可以用于点云处理的输入
        const response = await api.get(`/files/get_files?username=${username}&stage=image`)

        const imageFolders = response.data.folders || []
    
 
        // 转换为 FolderInfo 格式
        this.folders = imageFolders.map((folder: any) => ({
          name: folder.name,
          type: folder.type || 'folder',
          image_count: folder.image_count || 0,
          created_time: folder.created_time || Date.now(),
          item_type: 'folder' as const,
          category: 'images' as const
        }))
        
      } catch (error: any) {
        this.error = error.message || 'Failed to load folders. Please try again.'
        console.error('Error fetching folders:', error)
      } finally {
        this.loading = false
      }
    },

    // 获取处理历史 - 获取 colmap 阶段的文件夹
    async fetchResults() {
      this.loadingResults = true

      try {
        const { useUserStore } = await import('./userStore')
        const userStore = useUserStore()
        const username = userStore.user?.username
        if (!userStore.isAuthenticated) {
          throw new Error('用户未登录')
        }
        if (!username) {
          throw new Error('用户名不存在')
        }   
        const response = await api.get(`/files/get_files?username=${username}&stage=colmap`)
        console.log('colmapFolders', response.data.folders)
        const colmapFolders = response.data.folders || []
        this.results = colmapFolders.map((folder: any) => ({
          name: folder.name,
          status: 'completed' as const,
          timestamp: folder.created_time || Date.now(),
          processing_time: 0
            }))
      } catch (error: any) {
        console.error('Error fetching results:', error)
        this.results = []
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
        
        const formData = new FormData()
        formData.append('username', username)
        formData.append('folder_name', folderName)
        
        // 添加输出文件夹名称
        formData.append('output_folder_name', this.processingOptions.output_folder_name || '')
        
        // 添加处理选项
        formData.append('camera_model', this.processingOptions.camera_model)
        // FastAPI Form 布尔值：使用小写的 'true'/'false' 字符串
        formData.append('no_gpu', this.processingOptions.no_gpu ? 'true' : 'false')
        formData.append('skip_matching', this.processingOptions.skip_matching ? 'true' : 'false')
        formData.append('resize', this.processingOptions.resize ? 'true' : 'false')
        
        // 可选的可执行文件路径
        if (this.processingOptions.colmap_executable) {
          formData.append('colmap_executable', this.processingOptions.colmap_executable)
        }
        if (this.processingOptions.magick_executable) {
          formData.append('magick_executable', this.processingOptions.magick_executable)
        }
        
        const response = await api.post('/upload/point-cloud/process', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

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
        console.error('Error response:', error.response?.data)
        console.error('Error status:', error.response?.status)
        this.processingFolder = null
        
        // 显示更详细的错误信息
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to start processing. Please try again.'
        this.error = errorMessage
        
        throw error
      }
    },

    // 确保 WebSocket 连接
    async ensureWebSocketConnection() {
      if (!this.wsService) {
        this.wsService = usePointCloudWebSocket()
      }
      
      // 设置 WebSocket 消息监听器
      this.setupWebSocketListeners()
      
      // 等待连接建立
      if (!this.wsService.isConnected.value) {
        // 如果未连接，等待连接建立（最多等待5秒）
        const maxWaitTime = 5000
        const startTime = Date.now()
        
        while (!this.wsService.isConnected.value && (Date.now() - startTime) < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        if (!this.wsService.isConnected.value) {
          console.warn('WebSocket 连接超时，继续执行...')
        }
      }
      
      this.wsConnected = this.wsService.isConnected.value
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
    },

    // 便捷方法：直接从 fileStore 获取图片文件夹
    async getImageFoldersFromFileStore() {
      try {
        const { useFileStore } = await import('./fileStore')
        const fileStore = useFileStore()
        
        // 确保 fileStore 有最新数据
        if (fileStore.folders.length === 0) {
          await fileStore.fetchFiles()
        }
        
        return fileStore.folders.filter((folder: any) => folder.has_images)
      } catch (error) {
        console.error('Error getting image folders from fileStore:', error)
        return []
      }
    }
  }
})