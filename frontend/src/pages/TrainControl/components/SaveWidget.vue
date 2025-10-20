<template>
  <div class="save-widget">
    <h3>保存</h3>
    
    <!-- 保存截图 -->
    <div class="save-section">
      <div class="label-row">
        <label>保存截图</label>
        <div class="tooltip" v-if="screenshotPath" :title="screenshotPath">
          📁
        </div>
      </div>
      <button 
        class="save-button"
        @click="saveScreenshot"
        :disabled="!hasImage || saving"
      >
        {{ saving ? '保存中...' : '保存图片' }}
      </button>
    </div>

    <!-- 保存PLY -->
    <div class="save-section">
      <div class="label-row">
        <label>保存PLY</label>
        <div class="tooltip" v-if="plyPath" :title="plyPath">
          📁
        </div>
      </div>
      <button 
        class="save-button"
        @click="savePly"
        :disabled="saving"
      >
        保存PLY
      </button>
    </div>

    <!-- 保存状态 -->
    <div v-if="saveStatus" class="save-status" :class="saveStatus.type">
      {{ saveStatus.message }}
    </div>

    <!-- 保存历史 -->
    <div class="save-history" v-if="saveHistory.length > 0">
      <h4>保存历史</h4>
      <div class="history-list">
        <div 
          v-for="item in saveHistory" 
          :key="item.id"
          class="history-item"
        >
          <span class="file-name">{{ item.fileName }}</span>
          <span class="file-type">{{ item.type }}</span>
          <span class="save-time">{{ formatTime(item.timestamp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface SaveHistoryItem {
  id: string
  fileName: string
  type: 'screenshot' | 'ply'
  timestamp: number
}

interface SaveStatus {
  type: 'success' | 'error' | 'info'
  message: string
}

// 响应式数据
const screenshotPath = ref('_screenshots')
const plyPath = ref('_ply_files')
const saving = ref(false)
const hasImage = ref(true) // 假设有图像可用
const saveStatus = ref<SaveStatus | null>(null)
const saveHistory = ref<SaveHistoryItem[]>([])

// 计算属性
const nextFileId = computed(() => {
  const screenshots = saveHistory.value.filter(item => item.type === 'screenshot')
  return screenshots.length
})

// 方法
const saveScreenshot = async () => {
  if (!hasImage.value || saving.value) return
  
  saving.value = true
  saveStatus.value = { type: 'info', message: '正在保存截图...' }
  
  try {
    // 模拟保存截图的API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const fileName = `${String(nextFileId.value).padStart(5, '0')}.png`
    const historyItem: SaveHistoryItem = {
      id: Date.now().toString(),
      fileName,
      type: 'screenshot',
      timestamp: Date.now()
    }
    
    saveHistory.value.unshift(historyItem)
    saveStatus.value = { type: 'success', message: `截图已保存: ${fileName}` }
    
    // 保存到本地存储
    localStorage.setItem('saveHistory', JSON.stringify(saveHistory.value))
    
  } catch (error) {
    saveStatus.value = { 
      type: 'error', 
      message: `保存失败: ${error instanceof Error ? error.message : '未知错误'}` 
    }
  } finally {
    saving.value = false
    // 3秒后清除状态消息
    setTimeout(() => {
      saveStatus.value = null
    }, 3000)
  }
}

const savePly = async () => {
  if (saving.value) return
  
  saving.value = true
  saveStatus.value = { type: 'info', message: '正在保存PLY文件...' }
  
  try {
    // 模拟保存PLY的API调用
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const fileName = `model_${Date.now()}.ply`
    const historyItem: SaveHistoryItem = {
      id: Date.now().toString(),
      fileName,
      type: 'ply',
      timestamp: Date.now()
    }
    
    saveHistory.value.unshift(historyItem)
    saveStatus.value = { type: 'success', message: `PLY文件已保存: ${fileName}` }
    
    // 保存到本地存储
    localStorage.setItem('saveHistory', JSON.stringify(saveHistory.value))
    
  } catch (error) {
    saveStatus.value = { 
      type: 'error', 
      message: `保存失败: ${error instanceof Error ? error.message : '未知错误'}` 
    }
  } finally {
    saving.value = false
    // 3秒后清除状态消息
    setTimeout(() => {
      saveStatus.value = null
    }, 3000)
  }
}

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}

const loadSaveHistory = () => {
  try {
    const stored = localStorage.getItem('saveHistory')
    if (stored) {
      saveHistory.value = JSON.parse(stored)
    }
  } catch (error) {
    console.error('加载保存历史失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadSaveHistory()
})
</script>

<style scoped>
.save-widget {
  padding: 16px;
  background: #2a2a2a;
  border-radius: 8px;
  color: #ffffff;
}

.save-widget h3 {
  margin: 0 0 16px 0;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
}

.save-section {
  margin-bottom: 16px;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.label-row label {
  font-size: 14px;
  color: #cccccc;
  font-weight: 500;
}

.tooltip {
  cursor: help;
  font-size: 12px;
  opacity: 0.7;
}

.save-button {
  width: 100%;
  padding: 8px 16px;
  background: #4a9eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.save-button:hover:not(:disabled) {
  background: #357abd;
}

.save-button:disabled {
  background: #555555;
  cursor: not-allowed;
  opacity: 0.6;
}

.save-status {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 16px;
}

.save-status.success {
  background: #1a4d3a;
  color: #4ade80;
  border: 1px solid #22c55e;
}

.save-status.error {
  background: #4d1a1a;
  color: #f87171;
  border: 1px solid #ef4444;
}

.save-status.info {
  background: #1a3a4d;
  color: #60a5fa;
  border: 1px solid #3b82f6;
}

.save-history {
  margin-top: 20px;
}

.save-history h4 {
  margin: 0 0 12px 0;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #333333;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 12px;
}

.file-name {
  color: #ffffff;
  font-weight: 500;
  flex: 1;
}

.file-type {
  color: #4a9eff;
  background: #1a3a4d;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  text-transform: uppercase;
  margin: 0 8px;
}

.save-time {
  color: #888888;
  font-size: 11px;
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