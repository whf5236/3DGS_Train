import { ref,  watch } from 'vue'
import { useFileStore, type FileSystemItem, type FolderItem } from '@/stores/fileStore'
import { useUserStore } from '@/stores/userStore'

export function useFileListComponent(
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
  }

  const getRowClassName = ({ row }: { row: FileSystemItem }) => {
    return isSelected(row) ? 'selected-row' : ''
  }

  const getFolderTagType = (folder: FolderItem) => {
    switch (folder.type) {
      case 'images': return 'primary'
      case 'pcd': return 'success'
      case 'colmap': return 'warning'
      default: return 'info'
    }
  }

  const getFolderTypeLabel = (folder: FolderItem) => {
    switch (folder.type) {
      case 'images': return '图片'
      case 'pcd': return '点云'
      case 'colmap': return 'COLMAP'
      default: return '文件夹'
    }
  }

  // 获取文件标签类型（主要用于点云文件）
  const getFileTagType = (file: any): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
    // 由于上传的文件只会是点云文件，统一返回success标签
    return 'success'
  }

  // 获取文件类别标签文本


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
    initializeComponent,
    
    // 阶段相关的辅助方法
    getFolderStageTagType,
    getFolderStageLabel
  }
}