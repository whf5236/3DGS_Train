import { Picture, VideoPlay, Files,  Folder } from '@element-plus/icons-vue'
import type { Component } from 'vue'
import type { FolderItem } from '@/stores/fileStore'


export interface FileTypeInfo {
  icon: Component,
  color: string
  tagType: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  category: 'image' | 'video' | 'file' | 'folder' | 'pointcloud' | 'other'
  extensions?: string[]
  description?: string
  isFolder?: boolean
  folderType?: string
}
export interface UploadConfig {
  customFolderName: string
  stage: string
  fileType: string
  pathMode: 'default' | 'custom'
  customPath: string,
}
  
export function useCommon(){

  const fileTypeConfig = {
    image: {
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'],
        icon: Picture,
        color: '#409eff',
        tagType: 'primary' as const,
        category: 'image' as const,
        description: '图片文件',
        isFolder: false
    },
    video: {
        extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', '3gp', 'webm', 'ogg'],
        icon: VideoPlay,
        color: '#E6A23C',
        tagType: 'warning' as const,
        category: 'video' as const,
        description: '视频文件',
        isFolder: false
    },
    // 图片文件夹类型 - 支持整个文件夹上传
    imageFolder: {
        extensions: [] as string[], // 明确指定为 string[] 类型
        icon: Folder,
        color: '#67C23A',
        tagType: 'success' as const,
        category: 'folder' as const,
        description: '图片文件夹 - 包含用于3D重建的图片集合',
        isFolder: true,
        folderType: 'images'
    },
    // COLMAP处理后的文件夹
    colmapFolder: {
        extensions: [] as string[], // 明确指定为 string[] 类型
        icon: Folder,
        color: '#67C23A',
        tagType: 'success' as const,
        category: 'folder' as const,
        description: 'COLMAP文件夹 - 经过COLMAP处理生成的稀疏点云数据',
        isFolder: true,
        folderType: 'colmap'
    },
    // 点云文件类型 - 高斯泼溅训练后的结果
    pointcloud: {
        extensions: ['ply', 'pcd', 'xyz', 'pts', 'las', 'laz', 'obj', 'splat'],
        icon: Files,
        color: '#909399',
        tagType: 'info' as const,
        category: 'pointcloud' as const,
        description: '高斯泼溅训练过后的点云文件',
        isFolder: false
    },

}
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  
  const formatDate = (timestamp: number | string): string => {
      let date: Date
      if (typeof timestamp === 'string') {
      date = new Date(timestamp)
      } else {
      date = new Date(timestamp * 1000)
      }
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
      return '无效日期'
      }
      
      return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
      })
  }

  const getFileTypeInfo = (fileName: string, isFolder: boolean = false, category?: string): FileTypeInfo => {
    // 如果是文件夹，根据 category (stage) 判断类型
    if (isFolder) {
        // 使用后端返回的 category 字段来判断文件夹类型
        if (category === 'images' || category === 'image') {
            return fileTypeConfig.imageFolder
        }
        
        if (category === 'colmap') {
            return fileTypeConfig.colmapFolder
        }
        
        // 默认文件夹
        return {
            icon: Folder,
            color: '#67C23A',
            tagType: 'success',
            category: 'folder',
            description: '文件夹',
            isFolder: true
        }
    }
    
    // 如果是文件，优先使用后端返回的 category
    if (category) {
        if (category === 'image') {
            return fileTypeConfig.image
        }
        if (category === 'video') {
            return fileTypeConfig.video
        }
        if (category === 'pointcloud') {
            return fileTypeConfig.pointcloud
        }
    }
    
    // 如果没有 category，根据扩展名判断类型（向后兼容）
    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    
    // 检查是否是图片
    if (fileTypeConfig.image.extensions.includes(extension)) {
        return fileTypeConfig.image
    }
    
    // 检查是否是视频
    if (fileTypeConfig.video.extensions.includes(extension)) {
        return fileTypeConfig.video
    }
    
    // 检查是否是点云文件
    if (fileTypeConfig.pointcloud.extensions.includes(extension)) {
        return fileTypeConfig.pointcloud
    }
    
    // 默认文件类型
    return {
        icon: Files,
        color: '#909399',
        tagType: 'info',
        category: 'other',
        description: '其他文件',
        isFolder: false
    }
  }

  // 验证文件/文件夹类型
  const validateFileType = (fileName: string, allowedTypes: string[] = [], isFolder: boolean = false, category?: string): boolean => {
    if (allowedTypes.length === 0) return true
    const fileInfo = getFileTypeInfo(fileName, isFolder, category)
    return allowedTypes.includes(fileInfo.category)
  }
  // 获取文件/文件夹图标
  const getFileIcon = (fileName: string, isFolder: boolean = false, category?: string): Component => {
    return getFileTypeInfo(fileName, isFolder, category).icon
  }
  const getFolderTagType = (folder: FolderItem): 'primary' | 'success' | 'warning' | 'info' => {
    switch (folder.category) {
      case 'images': return 'primary'
      case 'pcd': return 'success'
      case 'colmap': return 'warning'
      default: return 'info'
    }
  }
  
  // 获取文件/文件夹颜色
  const getFileColor = (fileName: string, isFolder: boolean = false, category?: string): string => {
    return getFileTypeInfo(fileName, isFolder, category).color
  }

    // 获取文件/文件夹标签类型
  const getFileTagType = (fileName: string, isFolder: boolean = false, category?: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
    return getFileTypeInfo(fileName, isFolder, category).tagType
  }

  // 获取文件/文件夹类型描述
  const getFileDescription = (fileName: string, isFolder: boolean = false, category?: string): string | undefined => {
    return getFileTypeInfo(fileName, isFolder, category).description
  }
  // 获取文件夹类型
  const getFolderTypeLabel = (folder: FolderItem): string => {
    switch (folder.category) {
      case 'images': return '图片'
      case 'pcd': return '点云'
      case 'colmap': return 'COLMAP'
      default: return '文件夹'
    }
  }

  return {
    formatFileSize,
    formatDate,
    getFileTypeInfo,
    validateFileType,
    getFileIcon,
    getFileColor,
    getFileTagType,
    getFileDescription,
    getFolderTypeLabel,
    getFolderTagType,
  }
}
