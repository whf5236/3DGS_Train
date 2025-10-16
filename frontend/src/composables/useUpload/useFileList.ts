import { ref,  watch } from 'vue'
import { useFileStore, type FileSystemItem, type FolderItem } from '@/stores/fileStore'
import { useUserStore } from '@/stores/userStore'

// 定义 Props 接口
export interface FileListProps {
  selectedFile?: any
  filterProcessed?: boolean
  showPreview?: boolean
}

export type FileListEmits = {
  'file-selected': [file: any]
  'preview-file': [file: any]
  'folder-selected': [folder: any]
  'process-folder': [folderName: string]
}

export function useFileListComponent(
  props: FileListProps,
  emit: {
    (evt: 'file-selected', file: any): void
    (evt: 'preview-file', file: any): void
    (evt: 'folder-selected', folder: any): void
    (evt: 'process-folder', folderName: string): void
  }
) {
  // Stores
  const fileStore = useFileStore()
  const userStore = useUserStore()

  // Local reactive data - 同步 fileStore 的状态
  const searchQuery = ref(fileStore.searchQuery)
  const sortBy = ref<'name' | 'size' | 'created_time'>(fileStore.sortBy)

  // 监听本地搜索查询变化，同步到 fileStore
  watch(searchQuery, (newQuery) => {
    fileStore.setSearchQuery(newQuery)
  })

  // 监听 fileStore 的搜索查询变化，同步到本地
  watch(() => fileStore.searchQuery, (newQuery) => {
    if (searchQuery.value !== newQuery) {
      searchQuery.value = newQuery
    }
  })

  // 监听本地排序变化，同步到 fileStore
  watch(sortBy, (newSortBy) => {
    fileStore.setSorting(newSortBy, fileStore.sortOrder)
  })

  // 监听 fileStore 的排序变化，同步到本地
  watch(() => fileStore.sortBy, (newSortBy) => {
    if (sortBy.value !== newSortBy) {
      sortBy.value = newSortBy
    }
  })

  // Computed
  const isSelected = (item: FileSystemItem) => {
    if (item.item_type === 'folder') {
      return fileStore.selectedFolder === item.name
    } else {
      return fileStore.selectedFile?.name === item.name
    }
  }

  // Methods
  const updateSorting = () => {
    fileStore.setSorting(sortBy.value, fileStore.sortOrder)
  }

  const toggleSortOrder = () => {
    const newOrder = fileStore.sortOrder === 'asc' ? 'desc' : 'asc'
    fileStore.setSorting(fileStore.sortBy, newOrder)
  }

  const handleSelectFile = (file: any) => {
    fileStore.selectPreviewFile(file)
    emit('preview-file', file)
  }

  const getRowClassName = ({ row }: { row: FileSystemItem }) => {
    return isSelected(row) ? 'selected-row' : ''
  }

  const getFolderTagType = (folder: FolderItem) => {
    switch (folder.type) {
      case 'point_cloud': return 'success'
      case 'images': return 'primary'
      default: return 'info'
    }
  }

  const getFolderTypeLabel = (folder: FolderItem) => {
    switch (folder.type) {
      case 'point_cloud': return '点云'
      case 'images': return '图片'
      default: return '文件夹'
    }
  }

  // 根据当前阶段获取文件夹类型标签
  const getFolderStageTagType = (stage: string) => {
    switch (stage) {
      case 'image': return 'success'
      case 'colmap': return 'warning' 
      case 'pcd': return 'info'
      default: return 'info'
    }
  }

  // 根据当前阶段获取文件夹类型标签文本
  const getFolderStageLabel = (stage: string) => {
    switch (stage) {
      case 'image': return '图片阶段'
      case 'colmap': return 'COLMAP阶段'
      case 'pcd': return '点云阶段'
      default: return '未知阶段'
    }
  }

  // 简化的文件标签类型（主要用于文件夹）
  const getFileTagType = (item: any) => {
    if (item.item_type === 'folder') {
      // 文件夹根据当前阶段确定类型
      return getFolderStageTagType(fileStore.currentStage)
    } else {
      // 文件统一显示为 info 类型
      return 'info'
    }
  }

  // 简化的文件分类标签
  const getFileCategoryLabel = (item: any) => {
    if (item.item_type === 'folder') {
      // 文件夹显示当前阶段
      return getFolderStageLabel(fileStore.currentStage)
    } else {
      return '文件'
    }
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

  // 搜索查询处理方法
  const handleSearchInput = (value: string) => {
    searchQuery.value = value
  }

  // Lifecycle
  const initializeComponent = () => {
    fileStore.fetchFiles()
  }

  // 返回所有需要的响应式数据和方法
  return {
    // Stores
    fileStore,
    userStore,
    
    // Reactive data
    searchQuery,
    sortBy,
    
    // Computed
    isSelected,
    
    // Methods
    updateSorting,
    toggleSortOrder,
    handleSelectFile,
    handleSearchInput,
    getRowClassName,
    getFolderTagType,
    getFolderTypeLabel,
    getFileTagType,
    getFileCategoryLabel,
    formatFileSize,
    formatDate,
    initializeComponent,
    
    // 阶段相关的辅助方法
    getFolderStageTagType,
    getFolderStageLabel
  }
}