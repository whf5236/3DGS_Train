<template>
  <el-card class="file-preview">
    <template #header>
      <div class="preview-header">
        <span class="header-title">
          <el-icon><View /></el-icon> 文件预览
        </span>
        <!-- 视频文件显示标签页切换 -->
        <div v-if="isVideo" class="preview-tabs">
          <el-radio-group v-model="activeTab" size="small">
            <el-radio-button label="video">原始视频</el-radio-button>
            <el-radio-button label="frames" :disabled="!hasFrames">提取帧</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </template>

    <div v-if="loading" class="loading-container">
      <el-skeleton animated :rows="6" />
      <div class="loading-text">加载中...</div>
    </div>

    <div v-else-if="!selectedFile" class="empty-preview">
      <el-empty description="选择文件进行预览">
        <template #image>
          <el-icon class="empty-icon"><Document /></el-icon>
        </template>
      </el-empty>
    </div>

    <div v-else-if="loadError" class="error-preview">
      <el-result
        icon="error"
        title="加载文件预览失败"
        :sub-title="loadError"
      >
        <template #extra>
          <el-button type="primary" @click="retryLoad">
            <el-icon><RefreshRight /></el-icon> 重试
          </el-button>
        </template>
      </el-result>
    </div>

    <div v-else class="preview-container">
      <!-- 图片预览 -->
      <div v-if="isImage" class="image-preview" ref="imagePreviewContainer">
        <el-image
          :src="fileUrl"
          :style="{ transform: `scale(${zoomLevel})` }"
          @wheel.prevent="handleWheel"
          @error="handleImageError"
          @mousedown="startDrag"
          @touchstart.prevent="startDrag"
          alt="Image preview"
          class="preview-image"
          ref="previewImage"
          fit="contain"
          :preview-src-list="isImage ? [fileUrl] : []"
          :initial-index="0"
          hide-on-click-modal
        /> 
      </div>

      <!-- 视频预览 -->
      <div v-else-if="isVideo && activeTab === 'video'" class="video-preview">
        <video controls class="preview-video" @error="handleVideoError">
          <source v-if="fileUrl" :src="fileUrl" :type="`video/${getVideoType(selectedFile.filename)}`">
          您的浏览器不支持视频标签。
        </video>
      </div>

      <!-- 提取帧预览 -->
      <div v-else-if="isVideo && activeTab === 'frames'" class="frames-preview">
        <div v-if="loadingFrames" class="loading-frames">
          <el-skeleton animated :rows="3" />
          <div class="loading-text">加载帧数据中...</div>
        </div>
        
        <div v-else-if="frameError" class="frame-error">
          <el-result
            icon="error"
            title="加载帧数据失败"
            :sub-title="frameError"
          >
            <template #extra>
              <el-button type="primary" @click="loadFrames">
                <el-icon><RefreshRight /></el-icon> 重试
              </el-button>
            </template>
          </el-result>
        </div>
        
        <div v-else-if="!frames.length" class="no-frames">
          <el-empty description="暂无提取的帧数据">
            <template #image>
              <el-icon class="empty-icon"><Picture /></el-icon>
            </template>
            <template #description>
              <p>该视频尚未进行帧提取处理</p>
              <p>请先上传视频并启用帧提取功能</p>
            </template>
          </el-empty>
        </div>
        
        <div v-else class="frames-content">
          <!-- 当前选中帧的大图预览 -->
          <div class="current-frame-preview">
            <el-image
              v-if="currentFrame"
              :src="getFrameImageUrl(currentFrame.path)"
              :style="{ transform: `scale(${frameZoomLevel})` }"
              @wheel.prevent="handleFrameWheel"
              @error="handleFrameError"
              @mousedown="startFrameDrag"
              alt="Frame preview"
              class="frame-image"
              fit="contain"
              :preview-src-list="framePreviewList"
              :initial-index="currentFrameIndex"
              hide-on-click-modal
            />
          </div>

          <!-- 帧缩略图列表 -->
          <div class="frames-thumbnails">
            <div class="thumbnails-header">
              <span>帧列表 ({{ frames.length }} 帧)</span>
              <div class="thumbnail-controls">
                <el-button-group size="small">
                  <el-button @click="prevFrame" :disabled="currentFrameIndex <= 0" :icon="ArrowLeft" />
                  <el-button @click="nextFrame" :disabled="currentFrameIndex >= frames.length - 1" :icon="ArrowRight" />
                </el-button-group>
                <span class="frame-counter">{{ currentFrameIndex + 1 }} / {{ frames.length }}</span>
              </div>
            </div>
            
            <div class="thumbnails-grid">
              <div
                v-for="(frame, index) in frames"
                :key="frame.filename"
                :class="['thumbnail-item', { active: index === currentFrameIndex }]"
                @click="selectFrame(index)"
              >
                <el-image
                  :src="getFrameImageUrl(frame.path)"
                  class="thumbnail-image"
                  fit="cover"
                  :lazy="true"
                />
                <div class="thumbnail-info">
                  <span class="frame-number">{{ index + 1 }}</span>
                  <span class="frame-name">{{ frame.filename }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 帧缩放控制 -->
          <div class="zoom-controls-container">
            <div class="zoom-slider-container">
              <el-button circle @click="decreaseFrameZoom" :icon="ZoomOut" size="small" />
              <el-slider
                v-model="frameZoomLevel"
                :min="0.2"
                :max="5"
                :step="0.1"
                :format-tooltip="(value: number) => `${Math.round(value * 100)}%`"
                class="zoom-slider"
              />
              <el-button circle @click="increaseFrameZoom" :icon="ZoomIn" size="small" />
              <el-tag type="info" class="zoom-value">{{ Math.round(frameZoomLevel * 100) }}%</el-tag>
              <el-button circle @click="resetFrameZoom" :icon="RefreshRight" size="small" />
            </div>
          </div>

        </div>
      </div>

      <!-- 其他文件类型 -->
      <div v-else-if="!isImage && !isVideo" class="other-file-preview">
        <el-result icon="info" :title="selectedFile.filename">
          <template #icon>
            <el-icon class="file-type-icon"><Document /></el-icon>
          </template>
          <template #sub-title>
            <span>此文件类型无法预览</span> 
          </template>
          <template #extra>
            <el-button type="primary" @click="openInNewTab">
              <el-icon><TopRight /></el-icon> 在新标签页中打开
            </el-button>
            <el-button type="success" @click="downloadFile">
              <el-icon><Download /></el-icon> 下载
            </el-button>
          </template>
        </el-result>
        
        <!-- 其他文件信息 -->
        <el-descriptions
          :column="1"
          class="file-info glass-descriptions"
          title="文件信息"
        >
          <el-descriptions-item label="文件名称">{{ selectedFile.filename }}</el-descriptions-item>
          <el-descriptions-item label="文件类型">{{ selectedFile.type.toUpperCase() }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatFileSize(selectedFile.size) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <!-- 图片导航按钮 -->
    <div v-if="selectedFile && isImage" class="image-navigation">
      <el-button
        circle
        @click="prevImage"
        :disabled="!hasPrevImage"
        type="primary"
        :icon="ArrowLeft"
      />
      <el-button
        circle
        @click="nextImage"
        :disabled="!hasNextImage"
        type="primary"
        :icon="ArrowRight"
      />
    </div>
    <!-- 图片缩放控制 -->
    <div v-if="selectedFile && isImage" class="zoom-controls-container">
      <div class="zoom-slider-container">
        <el-button
          circle
          @click="decreaseZoom"
          :icon="ZoomOut"
          size="small"
        />

        <el-slider
          v-model="zoomLevel"
          :min="0.2"
          :max="5"
          :step="0.1"
          :format-tooltip="(value: number) => `${Math.round(value * 100)}%`"
          class="zoom-slider"
        />

        <el-button
          circle
          @click="increaseZoom"
          :icon="ZoomIn"
          size="small"
        />

        <el-tag type="info" class="zoom-value">{{ Math.round(zoomLevel * 100) }}%</el-tag>

        <el-button
          circle
          @click="resetZoom"
          :icon="RefreshRight"
          size="small"
        />
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts" name="Preview">
import { ref, computed, watch } from 'vue'
import { ElMessage,ElCard,ElDescriptions,
  ElDescriptionsItem,ElTag,
  ElSlider,ElButton,ElResult,
  ElSkeleton,ElEmpty,ElRadioGroup,
  ElRadioButton,ElIcon } from 'element-plus'
import {
  View,
  Document,
  RefreshRight,
  Download,
  TopRight,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  ArrowRight,
  Picture,
} from '@element-plus/icons-vue'
import { useFilePreview } from '@/composables/useUpload/useFilePreview'
import { useUserStore } from '@/stores/userStore'
import {api} from '@/api'

// --- 类型声明，与 composable 保持一致 ---
type FileItem = {
  filename: string
  type: string
  size: number
  path: string
}

type FilePreviewProps = {
  selectedFile: FileItem | null
  fileList: FileItem[]
}

type FrameItem = {
  filename: string
  path: string
  size: number
  modified: string
}

type VideoInfo = {
  width: number
  height: number
  fps: number
  total_frames: number
  duration: number
}

type ExtractionInfo = {
  original_fps: number
  target_fps: number
  total_video_frames: number
  extracted_frames: number
  duration_seconds: number
  extraction_timestamp: string
}

// --- Props and Emits ---
const props = defineProps<FilePreviewProps>()

const emit = defineEmits(['select-file'])

const propsRef = computed<FilePreviewProps>(() => ({
  selectedFile: props.selectedFile,
  fileList: props.fileList,
}))

// 使用原有的 composable
const {
  // Template refs
  imagePreviewContainer,
  previewImage,

  // State
  loading,
  loadError,
  zoomLevel,
  fileUrl,
  
  // Computed
  isImage,
  isVideo,
  hasPrevImage,
  hasNextImage,
  
  // Methods
  formatFileSize,
  retryLoad,
  handleImageError,
  handleVideoError,
  increaseZoom,
  decreaseZoom,
  resetZoom,
  handleWheel,
  openInNewTab,
  downloadFile,
  startDrag,
  prevImage,
  nextImage
} = useFilePreview(propsRef, emit)

// --- 新增的视频帧预览功能 ---
const userStore = useUserStore()
const activeTab = ref<'video' | 'frames'>('video')
const loadingFrames = ref(false)
const frameError = ref('')
const videoInfo = ref<VideoInfo | null>(null)
const frames = ref<FrameItem[]>([])
const extractionInfo = ref<ExtractionInfo | null>(null)
const currentFrameIndex = ref(0)
const frameZoomLevel = ref(1)

// 计算属性
const hasFrames = computed(() => frames.value.length > 0)
const currentFrame = computed(() => frames.value[currentFrameIndex.value] || null)
const framePreviewList = computed(() => 
  frames.value.map(frame => getFrameImageUrl(frame.path))
)

// 监听选中文件变化
watch(
  () => props.selectedFile, 
  async (newFile) => {
    if(!newFile) return
    if (isVideo.value) {
    activeTab.value = 'video'
    await loadVideoInfo()
    await loadFrames()
  } else {
    resetVideoData()
  }
}, { immediate: true })

// 方法
const resetVideoData = () => {
  videoInfo.value = null
  frames.value = []
  extractionInfo.value = null
  currentFrameIndex.value = 0
  frameError.value = ''
  frameZoomLevel.value = 1
}

const loadVideoInfo = async () => {
  if (!props.selectedFile || !isVideo.value) return
  
  try {
    const username = userStore.user?.username || 'current_user'
    const response = await api.get(`/upload/video_info/${props.selectedFile.filename}`, {
      params: { username }
    })
    videoInfo.value = response.data.info
  } catch (error) {
    console.error('加载视频信息失败:', error)
  }
}

const loadFrames = async () => {
  if (!props.selectedFile || !isVideo.value) return
  
  try {
    loadingFrames.value = true
    frameError.value = ''
    // 从文件路径推断文件夹名称
    const folderName = extractFolderName(props.selectedFile.path)
    if (!folderName) {
      frames.value = []
      return
    }
    const username = userStore.user?.username || 'current_user'
    const response = await api.get(`/upload/video_frames/${username}/${folderName}`)
    frames.value = response.data.frames || []
    extractionInfo.value = response.data.extraction_info
    currentFrameIndex.value = 0
    
  } catch (error: any) {
    frameError.value = error.response?.data?.detail || '加载帧数据失败'
    frames.value = []
  } finally {
    loadingFrames.value = false
  }
}

const extractFolderName = (filePath: string): string | null => {
  // 从文件路径中提取文件夹名称
  const pathParts = filePath.split('/')
  const videoIndex = pathParts.findIndex(part => part === 'video')
  if (videoIndex >= 0 && videoIndex < pathParts.length - 2) {
    return pathParts[videoIndex + 1]?? null
  }
  return null
}

const getFrameImageUrl = (framePath: string): string => {
  return `${api.defaults.baseURL}/upload/frame_image/${framePath}`
}

const getVideoType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  const typeMap: Record<string, string> = {
    'mp4': 'mp4',
    'avi': 'avi',
    'mov': 'quicktime',
    'mkv': 'x-matroska',
    'webm': 'webm',
    'm4v': 'mp4'
  }
  return typeMap[ext || ''] || 'mp4'
}

const selectFrame = (index: number) => {
  currentFrameIndex.value = index
}

const prevFrame = () => {
  if (currentFrameIndex.value > 0) {
    currentFrameIndex.value--
  }
}

const nextFrame = () => {
  if (currentFrameIndex.value < frames.value.length - 1) {
    currentFrameIndex.value++
  }
}

const handleFrameWheel = (event: WheelEvent) => {
  const delta = event.deltaY > 0 ? -0.1 : 0.1
  frameZoomLevel.value = Math.max(0.2, Math.min(5, frameZoomLevel.value + delta))
}

const increaseFrameZoom = () => {
  frameZoomLevel.value = Math.min(5, frameZoomLevel.value + 0.2)
}

const decreaseFrameZoom = () => {
  frameZoomLevel.value = Math.max(0.2, frameZoomLevel.value - 0.2)
}

const resetFrameZoom = () => {
  frameZoomLevel.value = 1
}

const startFrameDrag = (event: MouseEvent) => {
  // 实现拖拽功能
  event.preventDefault()
}

const handleFrameError = () => {
  ElMessage.error('帧图片加载失败')
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const formatDateTime = (isoString: string): string => {
  return new Date(isoString).toLocaleString('zh-CN')
}
</script>

<style scoped src="../../asset/upload/filePreview.css">

</style>
