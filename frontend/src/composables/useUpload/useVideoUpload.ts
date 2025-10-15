import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import type { UploadUserFile, UploadRawFile } from 'element-plus'
import { useVideoUploadStore } from '../../stores/videoUploadStore'

/**
 * 视频上传 Composable
 * 提供视频上传相关的状态管理和方法
 */
export const useVideoUpload = () => {
  const store = useVideoUploadStore()
  
  // 使用 storeToRefs 确保响应性
  const {
    fileList,
    selectedFile,
    frameRate,
    extractAllFrames,
    folderName,
    uploading,
    uploadProgress,
    username,
    previewFileList
  } = storeToRefs(store)

  // 方法直接从 store 获取（方法不需要 storeToRefs）
  const {
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
  } = store

  // 额外的便捷方法
  const hasFiles = computed(() => fileList.value.length > 0)
  const canUpload = computed(() => hasFiles.value && !uploading.value)
  const isProcessing = computed(() => uploading.value || uploadProgress.value.show)

  // 文件验证方法
  const validateFile = (file: UploadRawFile): boolean => {
    return beforeUpload(file)
  }

  // 批量移除文件
  const removeFiles = (files: UploadUserFile[]) => {
    files.forEach(file => removeFile(file))
  }

  // 获取支持的文件类型
  const getSupportedTypes = (): string[] => {
    return ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv']
  }

  // 检查文件是否为视频类型
  const isVideoFile = (filename: string): boolean => {
    const extension = getFileExtension(filename)
    return getSupportedTypes().includes(extension)
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
    username,
    previewFileList,
    
    // 计算属性
    hasFiles,
    canUpload,
    isProcessing,
    
    // 方法
    beforeUpload,
    handleFileChange,
    removeFile,
    removeFiles,
    clearFiles,
    convertToPreviewFormat,
    handleSelectFile,
    getFileExtension,
    formatFileSize,
    submitUpload,
    resetUploadProgress,
    resetAll,
    validateFile,
    getSupportedTypes,
    isVideoFile
  }
}

// 导出类型
export type { UploadProgress, PreviewFile } from '../../stores/videoUploadStore'