<template>
  <div class="pointcloud-preview">
    <el-card class="preview-card" shadow="hover">
      <template #header>
        <div class="preview-header">
          <span class="preview-title">
            <el-icon><View /></el-icon> 点云预览
          </span>
          <el-tag v-if="pointcloudType" :type="getTypeTagType()">
            {{ getTypeDisplayName() }}
          </el-tag>
        </div>
      </template>

      <div v-if="!selectedFile" class="empty-preview">
        <el-icon><Box /></el-icon>
        <p>选择点云文件进行预览</p>
      </div>

      <div v-else class="preview-content">
        <!-- 文件信息 -->
        <div class="file-info">
          <h4>{{ selectedFile.filename }}</h4>
          <div class="file-meta">
            <span class="meta-item">
              <el-icon><Document /></el-icon>
              {{ selectedFile.format }}
            </span>
            <span class="meta-item">
              <el-icon><DataAnalysis /></el-icon>
              {{ formatFileSize(selectedFile.size) }}
            </span>
            <span v-if="selectedFile.stats?.estimatedPoints" class="meta-item">
              <el-icon><Grid /></el-icon>
              {{ selectedFile.stats.estimatedPoints }} 点
            </span>
          </div>
        </div>

        <!-- 3D 预览区域 -->
        <div class="preview-viewport">
          <div class="viewport-placeholder">
            <el-icon><View /></el-icon>
            <p>3D 点云可视化</p>
            <p class="viewport-note">（可集成 Three.js 进行实时渲染）</p>
          </div>
        </div>

        <!-- 预览控制 -->
        <div class="preview-controls">
          <div class="control-group">
            <label>视角控制:</label>
            <el-button-group>
              <el-button size="small" @click="setView('front')">前视</el-button>
              <el-button size="small" @click="setView('side')">侧视</el-button>
              <el-button size="small" @click="setView('top')">俯视</el-button>
              <el-button size="small" @click="setView('iso')">等轴</el-button>
            </el-button-group>
          </div>
          
          <div class="control-group">
            <label>显示模式:</label>
            <el-radio-group v-model="displayMode" size="small">
              <el-radio-button label="points">点云</el-radio-button>
              <el-radio-button label="wireframe">线框</el-radio-button>
              <el-radio-button label="surface">表面</el-radio-button>
            </el-radio-group>
          </div>
          
          <div class="control-group">
            <label>点大小:</label>
            <el-slider
              v-model="pointSize"
              :min="1"
              :max="10"
              :step="0.5"
              style="width: 120px;"
            />
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="stats-panel">
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item label="文件类型">
              {{ selectedFile.type.toUpperCase() }}
            </el-descriptions-item>
            <el-descriptions-item label="文件大小">
              {{ formatFileSize(selectedFile.size) }}
            </el-descriptions-item>
            <el-descriptions-item label="估计点数">
              {{ selectedFile.stats?.estimatedPoints || '未知' }}
            </el-descriptions-item>
            <el-descriptions-item label="颜色信息">
              {{ selectedFile.stats?.hasColor ? '包含' : '不包含' }}
            </el-descriptions-item>
            <el-descriptions-item label="法向量">
              {{ selectedFile.stats?.hasNormals ? '包含' : '不包含' }}
            </el-descriptions-item>
            <el-descriptions-item label="格式">
              {{ selectedFile.format }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </el-card>

    <!-- 文件列表预览 -->
    <el-card v-if="fileList.length > 1" class="file-list-preview" shadow="hover">
      <template #header>
        <span class="preview-title">
          <el-icon><Files /></el-icon> 文件列表 ({{ fileList.length }})
        </span>
      </template>

      <div class="file-thumbnails">
        <div
          v-for="file in fileList"
          :key="file.uid"
          :class="['file-thumbnail', { active: selectedFile?.uid === file.uid }]"
          @click="$emit('select-file', file)"
        >
          <div class="thumbnail-icon">
            <el-icon><Box /></el-icon>
          </div>
          <div class="thumbnail-info">
            <div class="thumbnail-name">{{ file.filename }}</div>
            <div class="thumbnail-size">{{ formatFileSize(file.size) }}</div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  View,
  Box,
  Document,
  DataAnalysis,
  Grid,
  Files,
} from '@element-plus/icons-vue'

interface Props {
  selectedFile?: any
  fileList?: any[]
  pointcloudType?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedFile: null,
  fileList: () => [],
  pointcloudType: 'gaussian'
})

defineEmits<{
  'select-file': [file: any]
}>()

// 预览控制
const displayMode = ref('points')
const pointSize = ref(2)

// 类型相关
const getTypeTagType = () => {
  const typeMap: Record<string, string> = {
    gaussian: 'success',
    standard: 'primary',
    lidar: 'warning',
    mesh: 'info'
  }
  return typeMap[props.pointcloudType] || 'primary'
}

const getTypeDisplayName = () => {
  const nameMap: Record<string, string> = {
    gaussian: '高斯泼溅',
    standard: '标准点云',
    lidar: '激光雷达',
    mesh: '网格模型'
  }
  return nameMap[props.pointcloudType] || '点云文件'
}

// 视角控制
const setView = (view: string) => {
  ElMessage.info(`切换到${view === 'front' ? '前' : view === 'side' ? '侧' : view === 'top' ? '俯' : '等轴'}视图`)
  // 实际项目中这里会控制 3D 渲染器的相机位置
}

// 工具函数
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.pointcloud-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.preview-card,
.file-list-preview {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  -webkit-backdrop-filter: blur(15px);
  backdrop-filter: blur(15px);
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.preview-card :deep(.el-card__header),
.file-list-preview :deep(.el-card__header) {
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

.empty-preview .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: rgba(255, 255, 255, 0.4);
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-info h4 {
  margin: 0 0 8px 0;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.file-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.preview-viewport {
  height: 250px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewport-placeholder {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
}

.viewport-placeholder .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #67C23A;
}

.viewport-placeholder p {
  margin: 8px 0;
  font-size: 16px;
}

.viewport-note {
  font-size: 12px !important;
  font-style: italic;
  color: rgba(255, 255, 255, 0.5) !important;
}

.preview-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.control-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-group label {
  min-width: 80px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.stats-panel :deep(.el-descriptions) {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.stats-panel :deep(.el-descriptions__label) {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.05);
}

.stats-panel :deep(.el-descriptions__content) {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.02);
}

.file-thumbnails {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.file-thumbnail {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.05);
}

.file-thumbnail:hover {
  border-color: rgba(103, 194, 58, 0.5);
  background: rgba(103, 194, 58, 0.1);
}

.file-thumbnail.active {
  border-color: #67C23A;
  background: rgba(103, 194, 58, 0.15);
}

.thumbnail-icon {
  font-size: 24px;
  color: #67C23A;
  margin-bottom: 4px;
}

.thumbnail-info {
  text-align: center;
  width: 100%;
}

.thumbnail-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 2px;
  word-break: break-all;
  line-height: 1.2;
}

.thumbnail-size {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}

/* 滚动条样式 */
.file-thumbnails::-webkit-scrollbar {
  width: 4px;
}

.file-thumbnails::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.file-thumbnails::-webkit-scrollbar-thumb {
  background: rgba(103, 194, 58, 0.5);
  border-radius: 2px;
}

.file-thumbnails::-webkit-scrollbar-thumb:hover {
  background: rgba(103, 194, 58, 0.7);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .file-meta {
    flex-direction: column;
    gap: 8px;
  }
  
  .preview-controls {
    gap: 8px;
  }
  
  .control-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .control-group label {
    min-width: auto;
  }
  
  .file-thumbnails {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
  
  .preview-viewport {
    height: 200px;
  }
}
</style>