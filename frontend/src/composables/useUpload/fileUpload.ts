import { ref, computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadProps, UploadUserFile, UploadRawFile } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import { useFileStore } from '@/stores/fileStore'
import { api } from '@/api'
import type { UploadConfig} from './common'

export interface UploadProgress {
  show: boolean
  percentage: number
  completed: number
  total: number
  status: string
  targetFolder: string
  currentFile: string
  frameExtractionStatus: string
}

export interface PreviewFile {
  
  filename: string
  type: string
  size: number
  path: string
  uid: number | string
  folderName?: string 
}

export function FileUpload() {
  // 状态
  const fileList = ref<UploadUserFile[]>([])
  const selectedFile = ref<PreviewFile | null>(null)
  const frameRate = ref(5) 
  const extractAllFrames = ref(false)
  const folderName = ref('')
  const uploading = ref(false)
  const dialogImageUrl = ref('')
  const dialogVisible = ref(false)
  const userStore = useUserStore()
  const fileStore = useFileStore()
  const username = computed(() => userStore.user?.username || '')
  // 上传配置
  const uploadConfig = reactive<UploadConfig>({
    customFolderName: '',
    stage: '', 
    pathMode: 'default',
    customPath: '',
    fileType: '',
  })

  // 设置上传阶段
  const setStage = (stage: 'images' | 'colmap' | 'pcd') => {
    uploadConfig.stage = stage
    // 根据阶段自动设置上传类型
    switch (stage) {
      case 'images':
        uploadConfig.stage = 'images'
        break
      case 'colmap':
        uploadConfig.stage = 'colmap' // COLMAP通常是压缩包或文件夹
        break
      case 'pcd':
        uploadConfig.stage = 'pcd'
        break
      default:
        uploadConfig.stage = 'images'
    }
  }
  
  // 保持 folderName 和 uploadConfig.customFolderName 同步
  watch(() => folderName.value, (newValue) => {
    uploadConfig.customFolderName = newValue
  })
  
  watch(() => uploadConfig.customFolderName, (newValue) => {
    if (folderName.value !== newValue) {
      folderName.value = newValue
    }
  })
  
  // 上传进度
  const uploadProgress = reactive<UploadProgress>({
    show: false,
    percentage: 0,
    completed: 0,
    total: 0,
    status: '',
    targetFolder: '',
    currentFile: '',
    frameExtractionStatus: ''
  })

  // 辅助函数：获取文件类型配置
  const getFileTypeConfig = (component: string) => {
    switch (component) {
      case 'video':
        return { allowedTypes: ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv', 'flv', 'wmv', '3gp'], label: '视频' }
      case 'image':
        return { allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'ico'], label: '图片' }
      case 'folder':
        return { allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'zip', 'rar', '7z', 'tar', 'gz'], label: '图片或压缩包' }
      case 'pointcloud':
        return { allowedTypes: ['ply', 'pcd', 'xyz', 'las', 'laz', 'obj'], label: '点云' }
      case 'splat':
        return { allowedTypes: ['splat', 'ply', 'pcd'], label: 'Splat' }
      default:
        return { allowedTypes: ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv'], label: '视频' }
    }
  }

  const beforeUpload = (rawFile: UploadRawFile): boolean => {
    // 检查文件大小
    const maxSize = 500 * 1024 * 1024 // 500MB
    if (rawFile.size > maxSize) {
      ElMessage.error('文件大小不能超过 500MB')
      return false
    }
    
    // 根据上传组件类型检查文件类型
    const fileExtension = rawFile.name.split('.').pop()?.toLowerCase()
    if (!fileExtension) {
      ElMessage.error('无法识别文件类型')
      return false
    }
    
    const { allowedTypes, label } = getFileTypeConfig(uploadConfig.fileType)
    
    // 如果没有限制类型，则允许所有文件
    if (allowedTypes.length === 0) {
      return true
    }
    
    if (!allowedTypes.includes(fileExtension)) {
      ElMessage.error(`不支持的${label}格式: ${fileExtension}。支持的格式: ${allowedTypes.join(', ')}`)
      return false
    }
    
    return true
  }

  const handlePictureCardPreview: UploadProps['onPreview'] = (uploadFile) => {
      dialogImageUrl.value = uploadFile.url!
      dialogVisible.value = true
  }
  const handleFileChange: UploadProps['onChange'] = (uploadFile, uploadFiles) => {
    // 验证文件类型
    if (uploadFile.raw) {
      const fileExtension = uploadFile.name?.split('.').pop()?.toLowerCase()
      
      if (!fileExtension) {
        ElMessage.error('无法识别文件类型')
        return
      }
    
      const { allowedTypes, label } = getFileTypeConfig(uploadConfig.fileType || 'video')
      
      if (allowedTypes.length > 0 && !allowedTypes.includes(fileExtension)) {
        ElMessage.error(`不支持的${label}格式: ${fileExtension}。支持的格式: ${allowedTypes.join(', ')}`)
        return
      }
    }
    
    fileList.value = uploadFiles
    if (uploadFile.raw) {
      selectedFile.value = convertToPreviewFormat(uploadFile)
    }
  }

  const removeFile = (file: UploadUserFile) => {
    const index = fileList.value.findIndex(f => f.uid === file.uid)
    if (index > -1) {
      fileList.value.splice(index, 1)
      // 如果删除的是当前选中的文件，清空选中状态
      if (selectedFile.value && selectedFile.value.uid === file.uid) {
        selectedFile.value = null
      }
    }
  }

  const clearFiles = () => {
    fileList.value = []
    selectedFile.value = null
  }

  // 转换文件格式以适配 FilePreview 组件
  const convertToPreviewFormat = (uploadFile: UploadUserFile): PreviewFile | null => {
    if (!uploadFile.raw) return null
    
    const file = uploadFile.raw
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
    
    return {
      filename: file.name,
      type: fileExtension,
      size: file.size,
      path: uploadFile.url || URL.createObjectURL(file),
      uid: uploadFile.uid || ''
    }
  }



  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }


  // 重置上传进度
  const resetUploadProgress = () => {
    uploadProgress.show = false
    uploadProgress.percentage = 0
    uploadProgress.completed = 0
    uploadProgress.total = 0
    uploadProgress.status = ''
    uploadProgress.targetFolder = ''
    uploadProgress.currentFile = ''
    uploadProgress.frameExtractionStatus = ''
  }

  // 重置所有状态
  const resetAll = () => {
    fileList.value = []
    selectedFile.value = null
    frameRate.value = 5
    extractAllFrames.value = false
    uploadConfig.customFolderName = ''
    uploading.value = false
    resetUploadProgress()
  }




  const handleSelectFile = (file: PreviewFile) => {
    selectedFile.value = file
  }
  
  const finalFolderName = computed(() => {
    // 如果有自定义文件夹名，使用自定义的
    if (uploadConfig.customFolderName.trim()) {
      return uploadConfig.customFolderName.trim()
    }
    // 否则使用默认格式：用户名_阶段_时间戳
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const stage = uploadConfig.stage
    return `${username.value}_${stage}_${timestamp}`
  })

  // 生成预览文件列表
  const previewFileList = computed(() => {
    return fileList.value
      .filter(file => file.raw)
      .map(file => convertToPreviewFormat(file))
      .filter(file => file !== null) as PreviewFile[]
  })



  const uploadFiles = async () => {
    if (fileList.value.length === 0) {
      ElMessage.warning('请先选择文件')
      return
    }
    if (!username.value) {
      ElMessage.error('请先登录，无法获取用户名')
      return
    }
    
    console.log('上传信息：', {
      fileCount: fileList.value.length,
      stage: uploadConfig.stage,
      finalFolderName: finalFolderName.value,
      fileType: uploadConfig.fileType
    })
    
    uploading.value = true
    try {
      const formData = new FormData() 

      
      // 添加文件
      fileList.value.forEach((file) => {
        if (file.raw) {
          formData.append('files', file.raw)
        }
      })
   
      // 设置阶段信息
      if (uploadConfig.stage) {
        formData.append('stage', uploadConfig.stage)
      } 
      
      // 添加最终文件夹名称（自定义或默认生成）
      formData.append('finalFolderName', finalFolderName.value)
      
      // 添加上传类型，用于后端识别不同的上传组件
      formData.append('upload_type', uploadConfig.fileType)
      
      //添加视频帧率提取参数（仅视频类型需要）
      if (uploadConfig.fileType === 'video') {
        if (extractAllFrames.value) {
          formData.append('extract_all_frames', 'true')
        } else {
          formData.append('frame_rate', frameRate.value.toString())
        }
      }


      const response = await api.post('/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      if (response.data) {     
        ElMessage.success({
          message: `文件上传成功！保存到文件夹：${finalFolderName.value}`,
          duration: 5000
        })
        clearFiles()
        
        // 自动刷新文件列表
        await fileStore.fetchFiles(fileStore.currentStage)
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || '上传失败'
      ElMessage.error({
        message: String(errorMessage),
        duration: 5000
      })
    } finally {
      uploading.value = false
    }
  }
  return {
    // 状态
    fileList,
    selectedFile,
    frameRate,
    extractAllFrames,
    folderName,
    uploading,
    uploadProgress,
    uploadConfig,
    dialogImageUrl,
    dialogVisible,
    // 计算属性
    username,
    finalFolderName,
    previewFileList,
    // 方法
    beforeUpload,
    handleFileChange,
    handlePictureCardPreview,
    removeFile,
    clearFiles,
    handleSelectFile,
    getFileExtension,
    formatFileSize,
    resetUploadProgress,
    convertToPreviewFormat,
    resetAll,
    getFileTypeConfig,
    uploadFiles,
    setStage,
  }
}