import { defineStore } from 'pinia'
import { api } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

// 导入 userStore 类型，避免循环依赖
let userStore: any = null

// 文件类型定义
export interface FileItem {
  name: string
  path: string
  type: string
  size: number
  folder?: string
  created_time: number
  item_type: 'file'
  extension?: string
  category?: 'image' | 'video' | 'document' | 'archive' | 'pointcloud' | 'other'
}

export interface FolderItem {
  name: string
  type: string
  has_images: boolean
  image_count: number
  created_time: number
  item_type: 'folder'
  category?: 'images' | 'point_cloud' | 'colmap' | 'general'
}

export type FileSystemItem = FileItem | FolderItem

// 文件分类配置
export const FILE_CATEGORIES = {
  image: {
    name: '图片文件',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'] as string[],
    color: '#67C23A',
    icon: 'Picture'
  },
  video: {
    name: '视频文件', 
    extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'] as string[],
    color: '#E6A23C',
    icon: 'VideoPlay'
  },
  document: {
    name: '文档文件',
    extensions: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'] as string[],
    color: '#409EFF',
    icon: 'Document'
  },
  archive: {
    name: '压缩文件',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz'] as string[],
    color: '#F56C6C',
    icon: 'Box'
  },
  pointcloud: {
    name: '点云文件',
    extensions: ['ply', 'pcd', 'xyz', 'pts', 'las', 'laz', 'obj', 'splat'] as string[],
    color: '#909399',
    icon: 'Connection'
  },
  other: {
    name: '其他文件',
    extensions: [] as string[],
    color: '#909399',
    icon: 'Files'
  }
}

// 定义文件类别类型
export type FileCategoryKey = keyof typeof FILE_CATEGORIES

export const useFileStore = defineStore('file', {
  state: () => ({
    // 文件和文件夹数据
    files: [] as FileItem[],
    folders: [] as FolderItem[],
    processedFolders: [] as string[],
    
    // UI状态
    loading: false,
    error: null as string | null,
    
    // 选择状态
    selectedFolder: null as string | null,
    selectedFile: null as FileItem | null,
    previewFile: null as FileItem | null,
    
    // 过滤和排序
    currentFilter: 'all' as string,
    sortBy: 'name' as 'name' | 'size' | 'created_time',
    sortOrder: 'asc' as 'asc' | 'desc',
    
    // 视图模式
    viewMode: 'grid' as 'grid' | 'list',
    
    // 搜索
    searchQuery: ''
  }),

  getters: {
    // 合并文件和文件夹
    allItems: (state): FileSystemItem[] => {
      const foldersWithType = state.folders.map(folder => ({
        ...folder,
        item_type: 'folder' as const,
        category: folder.type === 'point_cloud' ? 'point_cloud' as const : 
                 folder.has_images ? 'images' as const : 'general' as const
      }))
      
      const filesWithType = state.files.map(file => {
        const extension = file.name.split('.').pop()?.toLowerCase() || ''
        let category: FileItem['category'] = 'other'
        
        // 查找文件类别
        for (const [categoryKey, config] of Object.entries(FILE_CATEGORIES)) {
          if (config.extensions.includes(extension)) {
            category = categoryKey as FileCategoryKey
            break
          }
        }
        
        return {
          ...file,
          item_type: 'file' as const,
          extension,
          category
        }
      })
      
      return [...foldersWithType, ...filesWithType]
    },

    // 过滤后的项目
    filteredItems: (state) => {
      return (state as any).allItems.filter((item: FileSystemItem) => {
        // 搜索过滤
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase()
          if (!item.name.toLowerCase().includes(query)) {
            return false
          }
        }
        
        // 类型过滤
        if (state.currentFilter === 'all') return true
        if (state.currentFilter === 'folders') return item.item_type === 'folder'
        if (state.currentFilter === 'files') return item.item_type === 'file'
        
        // 按文件类别过滤
        if (item.item_type === 'file') {
          return (item as FileItem).category === state.currentFilter
        }
        if (item.item_type === 'folder') {
          return (item as FolderItem).category === state.currentFilter
        }
        
        return false
      })
    },

    // 排序后的项目
    sortedItems: (state) => {
      const items = [...(state as any).filteredItems]
      
      return items.sort((a: FileSystemItem, b: FileSystemItem) => {
        let aValue: any, bValue: any
        
        switch (state.sortBy) {
          case 'name':
            aValue = a.name.toLowerCase()
            bValue = b.name.toLowerCase()
            break
          case 'size':
            aValue = a.item_type === 'file' ? (a as FileItem).size : 0
            bValue = b.item_type === 'file' ? (b as FileItem).size : 0
            break
          case 'created_time':
            aValue = a.created_time
            bValue = b.created_time
            break
          default:
            return 0
        }
        
        const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        return state.sortOrder === 'asc' ? result : -result
      })
    },

    // 文件类别统计
    categoryStats: (state) => {
      const stats: Record<string, number> = {
        all: 0,
        folders: 0,
        files: 0,
        ...Object.keys(FILE_CATEGORIES).reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
      }
      
      ;(state as any).allItems.forEach((item: FileSystemItem) => {
        stats.all = (stats.all || 0) + 1
        if (item.item_type === 'folder') {
          stats.folders = (stats.folders || 0) + 1
          const folderCategory = (item as FolderItem).category
          if (folderCategory && stats[folderCategory] !== undefined) {
            stats[folderCategory] = (stats[folderCategory] || 0) + 1
          }
        } else {
          stats.files = (stats.files || 0) + 1
          const fileCategory = (item as FileItem).category
          if (fileCategory && stats[fileCategory] !== undefined) {
            stats[fileCategory] = (stats[fileCategory] || 0) + 1
          }
        }
      })
      
      return stats
    },

    // 预览文件列表（仅图片）
    previewFileList: (state) => {
      return state.files
        .filter(file => {
          const extension = file.name.split('.').pop()?.toLowerCase() || ''
          return FILE_CATEGORIES.image.extensions.includes(extension)
        })
        .map(file => ({
          filename: file.name,
          type: file.type,
          size: file.size,
          path: file.path,
          created_time: file.created_time
        }))
    }
  },

  actions: {
    // 获取文件数据
    async fetchFiles() {
      this.loading = true
      this.error = null
      
      try {
        // 动态导入 userStore 避免循环依赖
        if (!userStore) {
          const { useUserStore } = await import('./userStore')
          userStore = useUserStore()
        }
        
        const username = userStore.user?.username
        
        // 如果有用户名，传递给后端API
        const params = username ? { username } : {}
        const response = await api.get('/upload/files', { params })
        
        this.files = response.data.files || []
        this.folders = response.data.folders || []
        this.processedFolders = response.data.processed_folders || []
      } catch (error: any) {
        this.error = error.response?.data?.message || '获取文件列表失败'
        if (this.error) {
          ElMessage.error(this.error)
        }
      } finally {
        this.loading = false
      }
    },

    // 刷新数据
    async refreshData() {
      await this.fetchFiles()
      ElMessage.success('数据已刷新')
    },

    // 选择项目
    selectItem(item: FileSystemItem) {
      if (item.item_type === 'folder') {
        this.selectedFolder = item.name
        this.selectedFile = null
      } else {
        this.selectedFile = item as FileItem
        this.selectedFolder = null
      }
    },

    // 选择预览文件
    selectPreviewFile(file: FileItem) {
      this.previewFile = file
    },

    // 处理文件夹
    async processFolder(folder: FolderItem) {
      try {
        await ElMessageBox.confirm(
          `确定要处理文件夹 "${folder.name}" 吗？这将开始点云重建过程。`,
          '确认处理',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        this.loading = true
        const response = await api.post(`/upload/process/${folder.name}`)
        
        ElMessage.success('处理任务已启动')
        await this.fetchFiles() // 刷新数据
        
      } catch (error: any) {
        if (error !== 'cancel') {
          ElMessage.error(error.response?.data?.message || '处理失败')
        }
      } finally {
        this.loading = false
      }
    },

    // 删除项目
    async deleteItem(item: FileSystemItem) {
      try {
        await ElMessageBox.confirm(
          `确定要删除 "${item.name}" 吗？此操作不可撤销。`,
          '确认删除',
          {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        this.loading = true
        const endpoint = item.item_type === 'folder' ? 
          `/upload/folders/${item.name}` : 
          `/upload/files/${item.name}`
        
        await api.delete(endpoint)
        
        ElMessage.success('删除成功')
        await this.fetchFiles() // 刷新数据
        
        // 清除选择状态
        if (item.item_type === 'folder' && this.selectedFolder === item.name) {
          this.selectedFolder = null
        }
        if (item.item_type === 'file' && this.selectedFile?.name === item.name) {
          this.selectedFile = null
        }
        
      } catch (error: any) {
        if (error !== 'cancel') {
          ElMessage.error(error.response?.data?.message || '删除失败')
        }
      } finally {
        this.loading = false
      }
    },

    // 设置过滤器
    setFilter(filter: string) {
      this.currentFilter = filter
    },

    // 设置排序
    setSorting(sortBy: typeof this.sortBy, sortOrder: typeof this.sortOrder) {
      this.sortBy = sortBy
      this.sortOrder = sortOrder
    },

    // 设置搜索查询
    setSearchQuery(query: string) {
      this.searchQuery = query
    },

    // 设置视图模式
    setViewMode(mode: typeof this.viewMode) {
      this.viewMode = mode
    },

    // 清除选择
    clearSelection() {
      this.selectedFolder = null
      this.selectedFile = null
      this.previewFile = null
    }
  }
})