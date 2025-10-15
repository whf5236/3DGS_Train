import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadProps, UploadUserFile, UploadRawFile } from 'element-plus'
import { useUserStore } from './userStore'
import { api } from '@/api'

export interface UploadProgress {
  show: boolean
  percentage: number
  completed: number
  total: number
  status: '' | 'success' | 'warning' | 'exception'
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
}

export const useVideoUploadStore = defineStore('videoUpload', () => {
  // 状态
  const fileList = ref<UploadUserFile[]>([])
  const selectedFile = ref<PreviewFile | null>(null)
  const frameRate = ref(5) 
  const extractAllFrames = ref(false)
  const folderName = ref('')
  const uploading = ref(false)
  
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

  // 计算属性
  const userStore = useUserStore()
  const username = computed(() => userStore.user?.username || '')
  
  // 为 FilePreview 组件准备文件列表
  const previewFileList = computed(() => {
    return fileList.value
      .filter(file => file.raw)
      .map(file => convertToPreviewFormat(file))
      .filter(file => file !== null) as PreviewFile[]
  })

  // 方法
  const beforeUpload = (rawFile: UploadRawFile): boolean => {
    // 检查文件大小
    const maxSize = 500 * 1024 * 1024 // 500MB
    if (rawFile.size > maxSize) {
      ElMessage.error('文件大小不能超过 500MB')
      return false
    }
    
    // 检查文件类型
    const allowedTypes = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv']
    const fileExtension = rawFile.name.split('.').pop()?.toLowerCase()
    
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      ElMessage.error(`不支持的视频格式: ${fileExtension}。支持的格式: ${allowedTypes.join(', ')}`)
      return false
    }
    
    return true
  }

  const handleFileChange: UploadProps['onChange'] = (uploadFile, uploadFiles) => {
    // 验证文件类型
    if (uploadFile.raw) {
      const allowedTypes = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv']
      const fileExtension = uploadFile.name?.split('.').pop()?.toLowerCase()
      
      if (!fileExtension || !allowedTypes.includes(fileExtension)) {
        ElMessage.error(`不支持的视频格式: ${fileExtension}。支持的格式: ${allowedTypes.join(', ')}`)
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

  const handleSelectFile = (file: PreviewFile) => {
    selectedFile.value = file
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

  const submitUpload = async (): Promise<void> => {
    if (!username.value) {
      ElMessage.error('请先登录，无法获取用户名')
      return
    }
    if (!fileList.value.length) {
      ElMessage.warning('请先选择至少一个视频文件')
      return
    }

    const form = new FormData()
    form.append('username', username.value)
    
    // 添加帧率提取参数
    if (extractAllFrames.value) {
      form.append('extract_all_frames', 'true')
    } else {
      form.append('frame_rate', frameRate.value.toString())
    }
    
    if (folderName.value && folderName.value.trim()) {
      form.append('folder_name', folderName.value.trim())
    }
    
    for (const f of fileList.value) {
      if (f.raw) form.append('files', f.raw, f.name)
    }

    try {
      uploading.value = true
      uploadProgress.show = true
      uploadProgress.percentage = 0
      uploadProgress.status = ''
      uploadProgress.total = fileList.value.length
      uploadProgress.completed = 0
      uploadProgress.frameExtractionStatus = '准备开始处理...'

      // 使用新的带帧提取功能的API端点
      const endpoint = fileList.value.length === 1 
        ? '/upload/videos_with_frame_extraction' 
        : '/upload/batch_videos_with_frame_extraction'

      const res = await api.post(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            uploadProgress.percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          }
        }
      })

      uploadProgress.status = 'success'
      uploadProgress.percentage = 100
      uploadProgress.completed = fileList.value.length
      uploadProgress.frameExtractionStatus = '帧提取完成'
      uploadProgress.targetFolder = res.data.folder_name

      ElMessage.success(`视频上传并帧提取成功：保存至 ${res.data.folder_name}`)
      // 清空列表与自定义名称
      fileList.value = []
      selectedFile.value = null
      folderName.value = ''
    } catch (e: any) {
      uploadProgress.status = 'exception'
      const msg = e?.response?.data?.detail || e?.message || '视频处理失败'
      ElMessage.error(msg)
    } finally {
      uploading.value = false
      // 3秒后隐藏进度条
      setTimeout(() => {
        uploadProgress.show = false
      }, 3000)
    }
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
    folderName.value = ''
    uploading.value = false
    resetUploadProgress()
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
    
    // 计算属性
    username,
    previewFileList,
    
    // 方法
    beforeUpload,
    handleFileChange,
    removeFile,
    clearFiles,
    convertToPreviewFormat,
    handleSelectFile,
    getFileExtension,
    formatFileSize,
    submitUpload,
    resetUploadProgress,
    resetAll
  }
})