import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import { api } from '@/api'
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
  stage: string
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
  const dialogImageUrl = ref('')
  const dialogVisible = ref(false)

  // 上传配置
  const uploadConfig = reactive<UploadConfig>({
    customFolderName: '',
    uploadComponent: 'image',
    pathMode: 'default',
    customPath: '',
    stage: 'image',
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
        }
      })

      // 添加用户信息和配置
      formData.append('username', username.value)
      formData.append('stage', uploadConfig.stage)
      
      if (uploadConfig.customFolderName.trim()) {
        formData.append('custom_folder_name', uploadConfig.customFolderName.trim())
      }

      const response = await api.post('/upload/upload_images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      if (response.data) {     
        ElMessage.success({
          message: `文件上传成功！`,
          duration: 5000
        })
        
        clearFiles()
      }
    } catch (error: any) {
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


  return {
    // 响应式数据
    fileList,
    selectedFile,
    uploading,
    dialogImageUrl,
    dialogVisible,
    uploadConfig,
    uploadProgress,
    
    // 计算属性
    username,
    finalFolderName,
    finalUploadPath,
    
    // 方法
    uploadFiles,
    handleRemove,
    handlePictureCardPreview,
    beforeUpload,
    clearFiles,
    handleSelectFile,
  }
}