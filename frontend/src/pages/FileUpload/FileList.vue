<template>
  <div class="file-list-container">
    <!-- 文件列表 - 占据全部宽度 -->
    <div class="file-list glass-card">

      <div class="toolbar">
        
        <div class="toolbar-top">
          <div class="header-title">
            <el-icon><Folder /></el-icon> 
            已上传的数据
          </div>
          <div class="header-actions">
            <el-button 
              @click="fileStore.refreshData" 
              :icon="Refresh" 
              :loading="fileStore.loading"
              class="glass-button"
            >
             刷新
            </el-button>
          </div>
        </div>
        <div class="toolbar-bottom">        
          <div class="toolbar-left">
            <el-select 
              v-model="fileStore.currentFilter" 
              placeholder="选择类型"   
              @change="fileStore.setFilter"
            >
                <el-option label="全部" value="all">
                  <span class="filter-option">全部 ({{ fileStore.categoryStats.all }})</span>
                </el-option>
                <el-option label="文件夹" value="folders">
                  <span class="filter-option">文件夹 ({{ fileStore.categoryStats.folders }})</span>
                </el-option>
                <el-option label="文件" value="files">
                  <span class="filter-option">文件 ({{ fileStore.categoryStats.files }})</span>
                </el-option>
                <el-divider />
                <el-option 
                  v-for="(category, key) in FILE_CATEGORIES" 
                  :key="key"
                  :label="category.name" 
                  :value="key"
                >
                  <span>{{ category.name }} ({{ fileStore.categoryStats[key] || 0 }})</span>
                </el-option>
            </el-select>
            <el-select 
              v-model="sortBy" 
              placeholder="排序方式" 
              @change="updateSorting"
            >
              <el-option label="名称" value="name" />
              <el-option label="大小" value="size" />
              <el-option label="时间" value="created_time" />
            </el-select>
            <el-button 
              size="default" 
              :icon="fileStore.sortOrder === 'asc' ? SortUp : SortDown"
              @click="toggleSortOrder"
            />
          </div>

          <div class="toolbar-right">
            <!-- 搜索框 -->
            <el-input
              v-model="searchQuery"
              placeholder="搜索文件..."
              size="default"
              style="width: 200px"
              :prefix-icon="Search"
              clearable
              @input="handleSearchInput"
            />

            <!-- 视图模式切换 -->
            <el-button-group size="small">
              <el-button 
                :type="fileStore.viewMode === 'grid' ? 'primary' : ''"
                :icon="Grid"
                @click="fileStore.setViewMode('grid')"
              />
              <el-button 
                :type="fileStore.viewMode === 'list' ? 'primary' : ''"
                :icon="List"
                @click="fileStore.setViewMode('list')"
              />
            </el-button-group>
          </div>
      </div>

      </div>
      
      <!-- Loading State -->
      <el-skeleton v-if="fileStore.loading" :rows="6" animated />

      <!-- Error State -->
      <el-result
        v-else-if="fileStore.error"
        icon="error"
        :title="fileStore.error"
      >
        <template #extra>
          <el-button type="primary" @click="fileStore.refreshData">
            <el-icon><Refresh /></el-icon> 再次尝试
          </el-button>
        </template>
      </el-result>

      <!-- 文件列表内容 -->
      <div v-else class="file-content">
        <!-- 空状态 -->
        <el-empty
          v-if="!fileStore.sortedItems.length"
          description="没有找到文件或文件夹"
        >
          <template #image>
            <el-icon class="empty-icon"><FolderOpened /></el-icon>
          </template>
          <template #description>
            <span v-if="fileStore.searchQuery">
              没有找到匹配 "{{ fileStore.searchQuery }}" 的文件
            </span>
            <span v-else-if="fileStore.currentFilter !== 'all'">
              当前分类下没有文件
            </span>
            <span v-else>
              上传数据开始使用
            </span>
          </template>
        </el-empty>

        <!-- 网格视图 -->
        <div v-else-if="fileStore.viewMode === 'grid'" class="file-grid">
          <FileCard
            v-for="item in fileStore.sortedItems"
            :key="`${item.item_type}-${item.name}`"
            :item="item"
            :selected="isSelected(item)"
            @click="fileStore.selectItem(item)"
            @process="fileStore.processFolder(item as FolderItem)"
            @delete="fileStore.deleteItem(item)"
          />
        </div>

        <!-- 列表视图 -->
        <el-table 
          v-else 
          :data="fileStore.sortedItems" 
          style="width: 100%"
          @row-click="fileStore.selectItem"
          :row-class-name="getRowClassName"
        >
          <el-table-column width="50">
            <template #default="{ row }">
              <FileIcon :item="row" size="24" />
            </template>
          </el-table-column>
          
          <el-table-column prop="name" label="名称" min-width="200">
            <template #default="{ row }">
              <div class="file-name-cell">
                <span class="file-name">{{ row.name }}</span>
                <el-tag 
                  v-if="row.item_type === 'folder'" 
                  size="small" 
                  :type="getFolderTagType(row)"
                >
                  {{ getFolderTypeLabel(row) }}
                </el-tag>
                <el-tag 
                  v-else 
                  size="small" 
                  :type="getFileTagType(row)"
                >
                  {{ getFileCategoryLabel(row) }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="size" label="大小" width="100">
            <template #default="{ row }">
              <span v-if="row.item_type === 'file'">
                {{ formatFileSize(row.size) }}
              </span>
              <span v-else-if="row.has_images" class="image-count">
                <el-icon><Picture /></el-icon> {{ row.image_count }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="created_time" label="创建时间" width="150">
            <template #default="{ row }">
              {{ formatDate(row.created_time) }}
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button
                  v-if="row.item_type === 'folder' && row.type !== 'point_cloud' && row.has_images"
                  type="primary"
                  size="large"
                  circle
                  @click.stop="fileStore.processFolder(row)"
                  :icon="Histogram"
                  title="处理点云"
                />
                <el-button
                  type="danger"
                  size="large"
                  circle
                  @click.stop="fileStore.deleteItem(row)"
                  :icon="Delete"
                  title="删除"
                />
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="FileList">
import { onMounted } from 'vue'
import {
  Folder,
  FolderOpened,
  Picture,
  Refresh,
  Search,
  Grid,
  List,
  SortUp,
  SortDown,
  Histogram,
  Delete,
} from '@element-plus/icons-vue'

import FileCard from './components/FileCard.vue'
import FileIcon from './components/FileIcon.vue'
import { useFileListComponent, type FileListProps } from '@/composables/useUpload/useFileList'
import { FILE_CATEGORIES, type FolderItem } from '@/stores/fileStore'

// Props
const props = withDefaults(defineProps<FileListProps & { showPreview?: boolean }>(), {
  selectedFile: null,
  filterProcessed: true,
  showPreview: true
})

// Emits
const emit = defineEmits<{
  'file-selected': [file: any]
  'preview-file': [file: any]
  'folder-selected': [folder: any]
  'process-folder': [folderName: string]
}>()

// 使用 composable
const {
  fileStore,
  searchQuery,
  sortBy,
  isSelected,
  updateSorting,
  toggleSortOrder,
  handleSearchInput,
  getRowClassName,
  getFolderTagType,
  getFolderTypeLabel,
  getFileTagType,
  getFileCategoryLabel,
  formatFileSize,
  formatDate,
  initializeComponent
} = useFileListComponent(props, emit)

// Lifecycle
onMounted(() => {
  initializeComponent()
})
</script>

<style scoped src="../../asset/upload/filelist.css">

</style>