import { Picture, VideoPlay, Files, Document, Folder } from '@element-plus/icons-vue'
import { Extension } from 'typescript'
import type { Component } from 'vue'

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

export function useFileUtils() {
    // 文件类型配置
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
        other: {
            extensions: [] as string[], // 明确指定为 string[] 类型
            icon: Files,
            color: '#909399',
            tagType: 'info' as const,
            category: 'other' as const,
            description: '其他文件',
            isFolder: false
        }
    }
    const getFileTypeInfo = (fileName: string, isFolder: boolean = false): FileTypeInfo => {
        // 如果是文件夹，根据文件夹名称判断类型
        if (isFolder) {
            const folderName = fileName.toLowerCase()
            
            // 判断是否为图片文件夹
            if (folderName.includes('image') || folderName.includes('photo') || 
                folderName.includes('pic') || folderName.includes('img')) {
                return {
                    icon: fileTypeConfig.imageFolder.icon,
                    color: fileTypeConfig.imageFolder?.color ,
                    tagType: fileTypeConfig.imageFolder?.tagType || 'success',
                    category: fileTypeConfig.imageFolder?.category || 'folder',
                    description: fileTypeConfig.imageFolder?.description || '图片文件夹 - 包含用于3D重建的图片集合',
                    isFolder: true,
                    folderType: fileTypeConfig.imageFolder?.folderType || 'images'
                }
            }
            
            // 判断是否为COLMAP文件夹
            if (folderName.includes('colmap') || folderName.includes('sparse') || 
                folderName.includes('dense') || folderName.includes('reconstruction')) {
                return {
                    icon: fileTypeConfig.colmapFolder.icon,
                    color: fileTypeConfig.colmapFolder.color,
                    tagType: fileTypeConfig.colmapFolder.tagType,
                    category: fileTypeConfig.colmapFolder.category,
                    description: fileTypeConfig.colmapFolder.description,
                    isFolder: true,
                    folderType: fileTypeConfig.colmapFolder.folderType
                }
            }
            
            // 默认文件夹类型
            return {
                icon: Folder,
                color: '#67C23A',
                tagType: 'success',
                category: 'folder',
                description: '文件夹',
                isFolder: true,
                folderType: 'general'
            }
        }
        
        // 处理单个文件
        const extension = fileName.split('.').pop()?.toLowerCase() || ''
        
        for (const [type, config] of Object.entries(fileTypeConfig)) {
            if (config.extensions.includes(extension)) {
                return {
                    icon: config.icon,
                    color: config.color,
                    tagType: config.tagType,
                    category: config.category,
                    extensions: config.extensions,
                    description: config.description,
                    isFolder: false
                }
            }
        }
        
        // 默认返回 other 类型
        return {
            icon: fileTypeConfig.other.icon,
            color: fileTypeConfig.other.color,
            tagType: fileTypeConfig.other.tagType,
            category: fileTypeConfig.other.category,
            extensions: fileTypeConfig.other.extensions,
            isFolder: false
        }
    }

    // 格式化文件大小
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // 验证文件/文件夹类型
    const validateFileType = (fileName: string, allowedTypes: string[] = [], isFolder: boolean = false): boolean => {
        if (allowedTypes.length === 0) return true
        const fileInfo = getFileTypeInfo(fileName, isFolder)
        return allowedTypes.includes(fileInfo.category)
    }

    // 获取文件/文件夹图标
    const getFileIcon = (fileName: string, isFolder: boolean = false): Component => {
        return getFileTypeInfo(fileName, isFolder).icon
    }

    // 获取文件/文件夹颜色
    const getFileColor = (fileName: string, isFolder: boolean = false): string => {
        return getFileTypeInfo(fileName, isFolder).color
    }

    // 获取文件/文件夹标签类型
    const getFileTagType = (fileName: string, isFolder: boolean = false): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
        return getFileTypeInfo(fileName, isFolder).tagType
    }

    // 获取文件/文件夹类型描述
    const getFileDescription = (fileName: string, isFolder: boolean = false): string | undefined => {
        return getFileTypeInfo(fileName, isFolder).description
    }

    // 检查是否为支持的文件夹类型
    const isSupportedFolder = (folderName: string): boolean => {
        const name = folderName.toLowerCase()
        return name.includes('image') || name.includes('photo') || name.includes('pic') || name.includes('img') ||
               name.includes('colmap') || name.includes('sparse') || name.includes('dense') || name.includes('reconstruction')
    }

    // 获取文件夹类型
    const getFolderType = (folderName: string): string => {
        const info = getFileTypeInfo(folderName, true)
        return info.folderType || 'general'
    }

    return {
        fileTypeConfig,
        getFileTypeInfo,
        formatFileSize,
        validateFileType,
        getFileIcon,
        getFileColor,
        getFileTagType,
        getFileDescription,
        isSupportedFolder,
        getFolderType
    }
}