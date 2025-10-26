<template>
  <div class="video-widget">
    <h3>视频录制</h3>
    
    <!-- 视频参数设置 -->
    <div class="video-params">
      <div class="param-row">
        <label>帧数</label>
        <input 
          type="number" 
          v-model.number="numFrames" 
          min="1" 
          max="10000"
          class="param-input"
        />
      </div>
      
      <div class="param-row">
        <label>相机高度</label>
        <input 
          type="number" 
          v-model.number="camHeight" 
          step="0.1"
          class="param-input"
        />
      </div>
      
      <div class="param-row">
        <label>半径</label>
        <input 
          type="number" 
          v-model.number="radius" 
          step="0.1"
          min="0.1"
          class="param-input"
        />
      </div>
      
      <div class="param-row">
        <label>分辨率</label>
        <select v-model="resolution" class="param-select">
          <option value="512">512x512</option>
          <option value="1024">1024x1024</option>
          <option value="2048">2048x2048</option>
          <option value="4096">4096x4096</option>
        </select>
      </div>
      
      <div class="param-row">
        <label>视野角 (FOV)</label>
        <input 
          type="number" 
          v-model.number="fov" 
          min="10" 
          max="120"
          class="param-input"
        />
      </div>
    </div>

    <!-- 预览设置 -->
    <div class="preview-section">
      <h4>预览设置</h4>
      <div class="preview-info">
        <div class="info-item">
          <span class="info-label">总帧数:</span>
          <span class="info-value">{{ numFrames }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">预计时长:</span>
          <span class="info-value">{{ estimatedDuration }}秒 (30fps)</span>
        </div>
        <div class="info-item">
          <span class="info-label">文件大小:</span>
          <span class="info-value">~{{ estimatedSize }}MB</span>
        </div>
      </div>
    </div>

    <!-- 渲染控制 -->
    <div class="render-section">
      <button 
        class="render-button"
        @click="startRender"
        :disabled="rendering"
      >
        {{ rendering ? '渲染中...' : '开始渲染' }}
      </button>
      
      <button 
        v-if="rendering"
        class="stop-button"
        @click="stopRender"
      >
        停止渲染
      </button>
    </div>

    <!-- 渲染进度 -->
    <div v-if="rendering" class="progress-section">
      <div class="progress-info">
        <span>进度: {{ renderProgress.current }} / {{ renderProgress.total }}</span>
        <span>{{ Math.round(renderProgress.percentage) }}%</span>
      </div>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: renderProgress.percentage + '%' }"
        ></div>
      </div>
      <div class="progress-details">
        <div>剩余时间: {{ estimatedTimeLeft }}</div>
        <div>当前帧: {{ renderProgress.current }}</div>
      </div>
    </div>

    <!-- 渲染历史 -->
    <div class="render-history" v-if="renderHistory.length > 0">
      <h4>渲染历史</h4>
      <div class="history-list">
        <div 
          v-for="item in renderHistory" 
          :key="item.id"
          class="history-item"
        >
          <div class="history-info">
            <span class="history-name">{{ item.name }}</span>
            <span class="history-params">
              {{ item.frames }}帧 | {{ item.resolution }}x{{ item.resolution }} | FOV{{ item.fov }}°
            </span>
          </div>
          <div class="history-actions">
            <span class="history-time">{{ formatTime(item.timestamp) }}</span>
            <button 
              class="download-button"
              @click="downloadVideo(item)"
              :disabled="!item.completed"
            >
              下载
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface RenderHistoryItem {
  id: string
  name: string
  frames: number
  resolution: number
  fov: number
  timestamp: number
  completed: boolean
  filePath?: string
}

interface RenderProgress {
  current: number
  total: number
  percentage: number
  startTime: number
}

// 响应式数据
const numFrames = ref(1000)
const camHeight = ref(0.3)
const radius = ref(6)
const resolution = ref(1024)
const fov = ref(40)
const rendering = ref(false)
const renderProgress = ref<RenderProgress>({
  current: 0,
  total: 0,
  percentage: 0,
  startTime: 0
})
const renderHistory = ref<RenderHistoryItem[]>([])

// 计算属性
const estimatedDuration = computed(() => {
  return Math.round(numFrames.value / 30 * 10) / 10
})

const estimatedSize = computed(() => {
  // 估算文件大小 (MB)
  const pixelCount = resolution.value * resolution.value
  const bytesPerFrame = pixelCount * 3 // RGB
  const totalBytes = bytesPerFrame * numFrames.value
  return Math.round(totalBytes / (1024 * 1024) * 10) / 10
})

const estimatedTimeLeft = computed(() => {
  if (!rendering.value || renderProgress.value.current === 0) return '--'
  
  const elapsed = Date.now() - renderProgress.value.startTime
  const avgTimePerFrame = elapsed / renderProgress.value.current
  const remaining = (renderProgress.value.total - renderProgress.value.current) * avgTimePerFrame
  
  const seconds = Math.round(remaining / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return minutes > 0 ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}` : `${seconds}s`
})

// 方法
const startRender = async () => {
  if (rendering.value) return
  
  rendering.value = true
  renderProgress.value = {
    current: 0,
    total: numFrames.value,
    percentage: 0,
    startTime: Date.now()
  }
  
  try {
    // 模拟渲染过程
    for (let i = 0; i < numFrames.value; i++) {
      if (!rendering.value) break // 检查是否被停止
      
      // 模拟渲染一帧的时间
      await new Promise(resolve => setTimeout(resolve, 50))
      
      renderProgress.value.current = i + 1
      renderProgress.value.percentage = (i + 1) / numFrames.value * 100
    }
    
    if (rendering.value) {
      // 渲染完成，添加到历史
      const historyItem: RenderHistoryItem = {
        id: Date.now().toString(),
        name: `video_${Date.now()}`,
        frames: numFrames.value,
        resolution: resolution.value,
        fov: fov.value,
        timestamp: Date.now(),
        completed: true,
        filePath: `videos/video_${Date.now()}.mp4`
      }
      
      renderHistory.value.unshift(historyItem)
      localStorage.setItem('videoRenderHistory', JSON.stringify(renderHistory.value))
    }
    
  } catch (error) {
    console.error('渲染失败:', error)
  } finally {
    rendering.value = false
  }
}

const stopRender = () => {
  rendering.value = false
}

const downloadVideo = (item: RenderHistoryItem) => {
  if (!item.completed) return
  
  // 模拟下载
  const link = document.createElement('a')
  link.href = '#' // 实际应用中这里应该是真实的文件URL
  link.download = `${item.name}.mp4`
  link.click()
}

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}

const loadRenderHistory = () => {
  try {
    const stored = localStorage.getItem('videoRenderHistory')
    if (stored) {
      renderHistory.value = JSON.parse(stored)
    }
  } catch (error) {
    console.error('加载渲染历史失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadRenderHistory()
})
</script>

<style scoped>
.video-widget {
  padding: 16px;
  background: #2a2a2a;
  border-radius: 8px;
  color: #ffffff;
}

.video-widget h3 {
  margin: 0 0 16px 0;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
}

.video-widget h4 {
  margin: 16px 0 8px 0;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.video-params {
  margin-bottom: 20px;
}

.param-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.param-row label {
  font-size: 14px;
  color: #cccccc;
  font-weight: 500;
  flex: 1;
}

.param-input, .param-select {
  width: 120px;
  padding: 6px 8px;
  background: #333333;
  border: 1px solid #555555;
  border-radius: 4px;
  color: #ffffff;
  font-size: 13px;
}

.param-input:focus, .param-select:focus {
  outline: none;
  border-color: #4a9eff;
}

.preview-section {
  background: #333333;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.info-label {
  color: #cccccc;
}

.info-value {
  color: #ffffff;
  font-weight: 500;
}

.render-section {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.render-button {
  flex: 1;
  padding: 10px 16px;
  background: #22c55e;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.render-button:hover:not(:disabled) {
  background: #16a34a;
}

.render-button:disabled {
  background: #555555;
  cursor: not-allowed;
  opacity: 0.6;
}

.stop-button {
  padding: 10px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.stop-button:hover {
  background: #dc2626;
}

.progress-section {
  background: #333333;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #cccccc;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #555555;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #4a9eff;
  transition: width 0.3s ease;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #888888;
}

.render-history {
  margin-top: 20px;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #333333;
  border-radius: 4px;
  margin-bottom: 8px;
}

.history-info {
  flex: 1;
}

.history-name {
  display: block;
  color: #ffffff;
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 4px;
}

.history-params {
  color: #888888;
  font-size: 12px;
}

.history-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-time {
  color: #888888;
  font-size: 11px;
}

.download-button {
  padding: 4px 8px;
  background: #4a9eff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.download-button:hover:not(:disabled) {
  background: #357abd;
}

.download-button:disabled {
  background: #555555;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 滚动条样式 */
.history-list::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-track {
  background: #333333;
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb {
  background: #555555;
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: #666666;
}
</style>