import { defineStore } from 'pinia'
import { api } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import { ref,computed } from 'vue'
// 导入 userStore 类型，避免循环依赖
const userStore = useUserStore()

const username = userStore.user?.username
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
  category?: 'image' | 'video' | 'archive' | 'pointcloud' | 'other'  
  stage?: string  
}

export interface FolderItem {
  name: string
  type: string
  image_count: number
  has_images: boolean  // 是否包含图片
  created_time: number
  item_type: 'folder'
  category?: 'images' | 'colmap' | 'pcd'  // 文件夹分类
  stage?: string  // 所属阶段
}

export type FileSystemItem = FileItem | FolderItem

// 处理阶段分类配置
export const STAGE_CATEGORIES = {
  image: {
    name: '图片阶段',
    description: '原始图片数据',
    color: '#67C23A',
    icon: 'Picture'
  },
  colmap: {
    name: 'COLMAP阶段',
    description: '特征提取与匹配',
    color: '#E6A23C',
    icon: 'DataAnalysis'
  },
  pcd: {
    name: '点云阶段',
    description: '训练后的点云数据',
    color: '#409EFF',
    icon: 'Connection'
  }
}

// 定义阶段类型
export type StageKey = keyof typeof STAGE_CATEGORIES

export const useFileStore = defineStore('file', () => {
  // 状态 - 使用 ref 和 reactive
  const files = ref<FileItem[]>([])
  const folders = ref<FolderItem[]>([])
  const processedFolders = ref<string[]>([])
  
  // 当前获取的阶段
  const currentStage = ref<'image' | 'colmap' | 'pcd'>('image')
  
  // UI状态
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // 选择状态
  const selectedFolder = ref<string | null>(null)
  const selectedFile = ref<FileItem | null>(null)
  const previewFile = ref<FileItem | null>(null)
  
  // 过滤和排序
  const currentFilter = ref<string>('all')
  const sortBy = ref<'name' | 'size' | 'created_time'>('name')
  const sortOrder = ref<'asc' | 'desc'>('asc')
  
  // 视图模式
  const viewMode = ref<'grid' | 'list'>('grid')
  
  // 搜索
  const searchQuery = ref('')

  // 计算属性 - 使用 computed
  const allItems = computed((): FileSystemItem[] => {
    const foldersWithType = folders.value.map(folder => ({
      ...folder,
      item_type: 'folder' as const,
      // 直接根据当前获取的阶段来确定文件夹类别
      category: currentStage.value === 'image' ? 'images' as const :
               currentStage.value === 'colmap' ? 'colmap' as const :
               currentStage.value === 'pcd' ? 'pcd' as const : 'images' as const
    }))
    
    const filesWithType = files.value.map(file => {
      const extension = file.name.split('.').pop()?.toLowerCase() || ''
      
      return {
        ...file,
        item_type: 'file' as const,
        extension
      }
    })
    
    return [...foldersWithType, ...filesWithType]
  })

  // 过滤后的项目
  const filteredItems = computed(() => {
    return allItems.value.filter((item: FileSystemItem) => {
      // 搜索过滤
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        if (!item.name.toLowerCase().includes(query)) {
          return false
        }
      }
      
      // 类型过滤
      if (currentFilter.value === 'all') 
        return true
      if (currentFilter.value === 'folders') 
        return item.item_type === 'folder'
      if (currentFilter.value === 'files') 
        return item.item_type === 'file'
      
      // 按文件类别过滤
      if (item.item_type === 'file') {
        return (item as FileItem).category === currentFilter.value
      }
      if (item.item_type === 'folder') {
        return (item as FolderItem).category === currentFilter.value
      }
      
      return false
    })
  })

  // 排序后的项目
  const sortedItems = computed(() => {
    const items = [...filteredItems.value]
    
    return items.sort((a: FileSystemItem, b: FileSystemItem) => {
      let aValue: any, bValue: any
      
      switch (sortBy.value) {
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
      return sortOrder.value === 'asc' ? result : -result
    })
  })

  // 阶段统计
  const stageStats = computed(() => {
    const stats: Record<string, number> = {
      all: 0,
      folders: 0,
      files: 0,
      ...Object.keys(STAGE_CATEGORIES).reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
    }
    
    allItems.value.forEach((item: FileSystemItem) => {
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
  })

  // 预览文件
  const previewFileList = computed(() => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
    return files.value
      .filter(file => {
        const extension = file.name.split('.').pop()?.toLowerCase() || ''
        return imageExtensions.includes(extension)
      })
      .map(file => ({
        filename: file.name,
        type: file.type,
        size: file.size,
        path: file.path,
        created_time: file.created_time
      }))
  })

  // 方法 - 普通函数
  const fetchFiles = async (stage: 'image' | 'colmap' | 'pcd' = 'image') => {
    loading.value = true
    error.value = null
    
    try {
      currentStage.value = stage
      const params = username ? { username, stage } : { stage }
      
      console.log('📂 获取文件列表:', {
        stage,
        username,
        params
      })
      
      const response = await api.get('/files/get_files', { params })  
      files.value = response.data.files || []
      folders.value = response.data.folders || []
      
      // 如果有错误或提示信息
      if (response.data.error) {
        ElMessage.error(`获取失败: ${response.data.error}`)
      } else if (response.data.message) {
        ElMessage.info(response.data.message)
      }
      
    } catch (err: any) {
      error.value = err.response?.data?.message || '获取文件列表失败'
      if (error.value) {
        ElMessage.error(error.value)
      }
    } finally {
      loading.value = false
    }
  }

  const refreshData = async () => {
    await fetchFiles(currentStage.value)
    ElMessage.success('数据已刷新')
  }

  const switchStage = async (stage: 'image' | 'colmap' | 'pcd') => {
    if (stage !== currentStage.value) {
      await fetchFiles(stage)
      ElMessage.success(`已切换到${stage === 'image' ? '图片' : stage === 'colmap' ? 'COLMAP' : '点云'}阶段`)
    }
  }

  const selectItem = (item: FileSystemItem) => {
    if (item.item_type === 'folder') {
      selectedFolder.value = item.name
      selectedFile.value = null
    } else {
      selectedFile.value = item as FileItem
      selectedFolder.value = null
    }
  }

  const selectPreviewFile = (file: FileItem) => {
    previewFile.value = file
  }

  const processFolder = async (folder: FolderItem) => {
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

      loading.value = true
      const response = await api.post(`/upload/process/${folder.name}`)
      
      ElMessage.success('处理任务已启动')
      await fetchFiles() // 刷新数据
      
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(err.response?.data?.message || '处理失败')
      }
    } finally {
      loading.value = false
    }
  }

  // s删除功能待完善
  const deleteItem = async (item: FileSystemItem) => {
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

      loading.value = true
      const endpoint = item.item_type === 'folder' ? 
        `/upload/folders/${item.name}` : 
        `/upload/files/${item.name}`
      
      await api.delete(endpoint)
      
      ElMessage.success('删除成功')
      await fetchFiles() // 刷新数据
      
      // 清除选择状态
      if (item.item_type === 'folder' && selectedFolder.value === item.name) {
        selectedFolder.value = null
      }
      if (item.item_type === 'file' && selectedFile.value?.name === item.name) {
        selectedFile.value = null
      }
      
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(err.response?.data?.message || '删除失败')
      }
    } finally {
      loading.value = false
    }
  }

  const setFilter = (filter: string) => {
    currentFilter.value = filter
  }

  const setSorting = (newSortBy: typeof sortBy.value, newSortOrder: typeof sortOrder.value) => {
    sortBy.value = newSortBy
    sortOrder.value = newSortOrder
  }

  const setSearchQuery = (query: string) => {
    searchQuery.value = query
  }

  const setViewMode = (mode: typeof viewMode.value) => {
    viewMode.value = mode
  }

  const clearSelection = () => {
    selectedFolder.value = null
    selectedFile.value = null
    previewFile.value = null
  }

  // 返回所有状态、计算属性和方法
  return {
    // 状态
    files,
    folders,
    processedFolders,
    currentStage,
    loading,
    error,
    selectedFolder,
    selectedFile,
    previewFile,
    currentFilter,
    sortBy,
    sortOrder,
    viewMode,
    searchQuery,
    
    // 计算属性
    allItems,
    filteredItems,
    sortedItems,
    stageStats,
    previewFileList,
    
    // 方法
    fetchFiles,
    refreshData,
    switchStage,
    selectItem,
    selectPreviewFile,
    processFolder,
    deleteItem,
    setFilter,
    setSorting,
    setSearchQuery,
    setViewMode,
    clearSelection
  }
})