import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import { api } from '@/api'
import { useFileUploadWebSocket } from '@/composables/useWebSocket'
import type { UploadUserFile, UploadProps } from 'element-plus'

export type PreviewFile = {
  filename: string
  type: string
  size: number
  path: string
  uid?: number
}

export type UploadConfig = {
  customFolderName: string
  uploadComponent: string
  pathMode: 'default' | 'custom'
  customPath: string
}

export type UploadProgress = {
  show: boolean
  percentage: number
  completed: number
  total: number
  status: 'info' | 'success' | 'warning' | 'exception'
  targetFolder: string
  currentFile: string
}

export function useImageUpload() {
  // 响应式数据
  const fileList = ref<UploadUserFile[]>([])
  const selectedFile = ref<PreviewFile | null>(null)
  const uploading = ref(false)
  const showWebSocketStatus = ref(true)
  const dialogImageUrl = ref('')
  const dialogVisible = ref(false)

  // 上传配置
  const uploadConfig = reactive<UploadConfig>({
    customFolderName: '',
    uploadComponent: 'image',
    pathMode: 'default',
    customPath: ''
  })

  // 上传进度
  const uploadProgress = reactive<UploadProgress>({
    show: false,
    percentage: 0,
    completed: 0,
    total: 0,
    status: 'info',
    targetFolder: '',
    currentFile: ''
  })

  // WebSocket 集成
  const { 
    subscribeToFileUploads, 
    notifyUploadStart, 
    onUploadStatus, 
    isConnected 
  } = useFileUploadWebSocket()

  // 用户信息
  const userStore = useUserStore()
  const username = computed(() => userStore.user?.username || '')

  // 计算最终文件夹名称
  const finalFolderName = computed(() => {
    if (uploadConfig.customFolderName.trim()) {
      return uploadConfig.customFolderName.trim()
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    return `${username.value}_${uploadConfig.uploadComponent}_${timestamp}`
  })

  // 计算最终上传路径
  const finalUploadPath = computed(() => {
    if (uploadConfig.pathMode === 'custom' && uploadConfig.customPath.trim()) {
      return uploadConfig.customPath.trim()
    }
    return `not_processed/${username.value}/image/${finalFolderName.value}`
  })

  // WebSocket 状态监听
  let unsubscribeUploadStatus: (() => void) | null = null

  // 处理WebSocket上传状态消息
  function handleUploadStatusMessage(message: any) {
    switch (message.type) {
      case 'upload_batch_started':
        uploadProgress.show = true
        uploadProgress.percentage = 0
        uploadProgress.completed = 0
        uploadProgress.total = message.file_count
        uploadProgress.status = 'info'
        uploadProgress.targetFolder = message.target_path
        uploadProgress.currentFile = ''
        break
        
      case 'file_upload_status':
        if (message.status === 'started') {
          uploadProgress.currentFile = message.filename
        } else if (message.status === 'completed') {
          uploadProgress.completed++
          uploadProgress.percentage = Math.round((uploadProgress.completed / uploadProgress.total) * 100)
          if (uploadProgress.completed === uploadProgress.total) {
            uploadProgress.status = 'success'
            uploadProgress.currentFile = ''
          }
        } else if (message.status === 'failed') {
          uploadProgress.status = 'exception'
        }
        break
        
      case 'upload_batch_completed':
        uploadProgress.show = false
        ElMessage.success(`上传完成！文件保存到: ${message.target_path}`)
        break
        
      case 'upload_batch_failed':
        uploadProgress.show = false
        uploadProgress.status = 'exception'
        break
    }
  }

  // 文件上传函数
  const uploadFiles = async () => {
    if (fileList.value.length === 0) {
      ElMessage.warning('请先选择文件')
      return
    }

    if (!username.value) {
      ElMessage.error('请先登录，无法获取用户名')
      return
    }

    uploading.value = true

    try {
      const formData = new FormData()
      
      // 添加文件
      fileList.value.forEach((file) => {
        if (file.raw) {
          formData.append('files', file.raw)
          // 通过WebSocket通知上传开始
          if (isConnected.value) {
            notifyUploadStart(file.name)
          }
        }
      })

      // 添加用户信息和配置
      formData.append('username', username.value)
      formData.append('upload_component', uploadConfig.uploadComponent)
      
      if (uploadConfig.customFolderName.trim()) {
        formData.append('custom_folder_name', uploadConfig.customFolderName.trim())
      }

      const response = await api.post('/upload/upload_images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data) {
        const { folder_structure, files, upload_info } = response.data
        
        ElMessage.success({
          message: `文件上传成功！保存到: ${folder_structure.full_path}`,
          duration: 5000
        })
        
        console.log('上传结果:', {
          folder_structure,
          files,
          upload_info
        })
        clearFiles()
      }
    } catch (error: any) {
      console.error('上传失败:', error)
      ElMessage.error(error.response?.data?.detail || '上传失败')
    } finally {
      uploading.value = false
    }
  }

  // 文件处理函数
  const handleRemove: UploadProps['onRemove'] = (uploadFile, uploadFiles) => {
    console.log(uploadFile, uploadFiles)
  }

  const handlePictureCardPreview: UploadProps['onPreview'] = (uploadFile) => {
    dialogImageUrl.value = uploadFile.url!
    dialogVisible.value = true
  }

  const beforeUpload = (file: any) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      ElMessage.error('只能上传图片文件!')
      return false
    }
    
    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      ElMessage.error('图片大小不能超过 10MB!')
      return false
    }
    
    return true
  }

  const clearFiles = () => {
    fileList.value = []
    selectedFile.value = null
  }

  const handleSelectFile = (file: PreviewFile) => {
    selectedFile.value = file
  }

  // 初始化和清理
  const initializeWebSocket = async () => {
    try {
      // 等待 WebSocket 连接并订阅文件上传事件
      await subscribeToFileUploads()
      
      // 监听上传状态变化
      unsubscribeUploadStatus = onUploadStatus((message) => {
        console.log('收到上传状态:', message)
        handleUploadStatusMessage(message)
      })
    } catch (error) {
      console.error('WebSocket 订阅失败:', error)
    }
  }

  const cleanup = () => {
    if (unsubscribeUploadStatus) {
      unsubscribeUploadStatus()
    }
  }

  // 生命周期钩子
  onMounted(initializeWebSocket)
  onUnmounted(cleanup)

  return {
    // 响应式数据
    fileList,
    selectedFile,
    uploading,
    showWebSocketStatus,
    dialogImageUrl,
    dialogVisible,
    uploadConfig,
    uploadProgress,
    
    // 计算属性
    username,
    finalFolderName,
    finalUploadPath,
    isConnected,
    
    // 方法
    uploadFiles,
    handleRemove,
    handlePictureCardPreview,
    beforeUpload,
    clearFiles,
    handleSelectFile,
    handleUploadStatusMessage,
    initializeWebSocket,
    cleanup
  }
}