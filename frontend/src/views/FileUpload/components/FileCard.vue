<template>
  <div 
    class="file-card"
    :class="{ 'selected': selected }"
    @click="$emit('click', item)"
  >
    <div class="card-content">
      <!-- 文件图标 -->
      <div class="file-icon-container">
        <FileIcon :item="item" :size="48" />
        
        <!-- 文件夹特殊标识 -->
        <div v-if="item.item_type === 'folder'" class="folder-badge">
          <el-tag 
            :type="getFolderTagType(item)" 
            size="small"
            class="folder-type-tag"
          >
            {{ getFolderTypeLabel(item) }}
          </el-tag>
        </div>
        
        <!-- 图片数量标识 -->
        <div v-if="item.item_type === 'folder' && item.has_images" class="image-count-badge">
          <el-icon><Picture /></el-icon>
          {{ item.image_count }}
        </div>
      </div>

      <!-- 文件信息 -->
      <div class="file-info">
        <div class="file-name" :title="item.name">
          {{ item.name }}
        </div>
        
        <div class="file-meta">
          <span v-if="item.item_type === 'file'" class="file-size">
            {{ formatFileSize(item.size) }}
          </span>
          <span class="file-date">
            {{ formatDate(item.created_time) }}
          </span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="card-actions" @click.stop>
        <el-button
          v-if="item.item_type === 'folder' && item.category === 'images' && item.has_images"
          type="primary"
          size="large"
          circle
          @click="$emit('process', item)"
          :icon="Histogram"
          title="处理点云"
        />
        <el-button
          type="danger"
          size="large"
          circle
          @click="$emit('delete', item)"
          :icon="Delete"
          title="删除"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Picture, Histogram, Delete } from '@element-plus/icons-vue'
import FileIcon from './FileIcon.vue'
import type { FileSystemItem, FolderItem } from '@/stores/fileStore'
import { useCommon } from '@/composables/useUpload/common'

const { formatFileSize,formatDate, 
  getFolderTagType, getFolderTypeLabel } = useCommon()
// Props
const props = withDefaults(defineProps<{
  item: FileSystemItem
  selected?: boolean
}>(), {
  selected: false
})

// Emits
const emit = defineEmits<{
  (e: 'click', item: FileSystemItem): void
  (e: 'process', item: FileSystemItem): void
  (e: 'delete', item: FileSystemItem): void
}>()

</script>

<style scoped>
.file-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--el-bg-color);
  position: relative;
  overflow: hidden;
}

.file-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.file-card.selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}


.folder-badge {
  position: absolute;
  top: -8px;
  right: -8px;
}

.folder-type-tag {
  font-size: 10px;
  padding: 2px 4px;
}

.image-count-badge {
  position: absolute;
  bottom: -8px;
  right: -8px;
  background: var(--el-color-primary);
  color: white;
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.file-info {
  text-align: center;
  width: 100%;
}

.file-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.file-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.card-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.file-card:hover .card-actions {
  opacity: 1;
}

.card-actions .el-button {
  padding: 4px;
}
</style>