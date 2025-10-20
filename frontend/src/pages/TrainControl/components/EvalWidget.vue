<template>
  <div class="eval-widget">
    <h3>评估工具</h3>
    
    <!-- 评估代码输入 -->
    <div class="eval-input">
      <label for="eval-code">评估代码:</label>
      <input 
        id="eval-code"
        v-model="evalCode" 
        type="text" 
        class="eval-input-field"
        placeholder="输入要评估的代码，例如: gs"
        @keyup.enter="evaluateCode"
      />
      <button @click="evaluateCode" class="btn btn-primary">评估</button>
    </div>

    <!-- 评估结果显示 -->
    <div class="eval-result">
      <h4>评估结果:</h4>
      <div class="result-container">
        <div v-if="loading" class="loading">评估中...</div>
        <div v-else-if="error" class="error">
          错误: {{ error }}
        </div>
        <div v-else-if="result" class="result-content">
          <ObjectViewer 
            :data="result" 
            :depth="0" 
            :object-name="evalCode"
          />
        </div>
        <div v-else class="no-result">
          暂无评估结果
        </div>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="eval-history">
      <h4>评估历史:</h4>
      <div class="history-list">
        <div 
          v-for="(item, index) in history" 
          :key="index" 
          class="history-item"
          @click="loadFromHistory(item)"
        >
          <span class="history-code">{{ item.code }}</span>
          <span class="history-time">{{ formatTime(item.timestamp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import ObjectViewer from './ObjectViewer.vue'

interface HistoryItem {
  code: string
  result: any
  timestamp: number
}

// 响应式数据
const evalCode = ref('gs')
const result = ref<any>(null)
const loading = ref(false)
const error = ref('')
const history = ref<HistoryItem[]>([])

// 方法
async function evaluateCode() {
  if (!evalCode.value.trim()) return
  
  loading.value = true
  error.value = ''
  
  try {
    // 模拟评估过程 - 在实际应用中这里会调用后端API
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 模拟不同类型的结果
    const mockResults = {
      'gs': {
        _xyz: { shape: [1000, 3], dtype: 'float32', device: 'cuda:0' },
        _rotation: { shape: [1000, 4], dtype: 'float32', device: 'cuda:0' },
        _scaling: { shape: [1000, 3], dtype: 'float32', device: 'cuda:0' },
        _opacity: { shape: [1000, 1], dtype: 'float32', device: 'cuda:0' },
        _features_dc: { shape: [1000, 1, 3], dtype: 'float32', device: 'cuda:0' },
        _features_rest: { shape: [1000, 15, 3], dtype: 'float32', device: 'cuda:0' },
        get_xyz: 'function',
        get_rotation: 'function',
        get_scaling: 'function',
        get_opacity: 'function'
      },
      'render_cam': {
        image_width: 800,
        image_height: 600,
        FoVx: 1.047,
        FoVy: 0.785,
        znear: 0.01,
        zfar: 100.0,
        world_view_transform: { shape: [4, 4], dtype: 'float32' },
        projection_matrix: { shape: [4, 4], dtype: 'float32' },
        camera_center: { shape: [3], dtype: 'float32' }
      },
      'self': {
        bg_color: { shape: [3], dtype: 'float32', value: [0, 0, 0] },
        scaling_modifier: 1.0,
        override_color: null,
        compute_cov3D_python: false,
        convert_SHs_python: false
      }
    }
    
    result.value = mockResults[evalCode.value as keyof typeof mockResults] || 
                   { message: `未找到 "${evalCode.value}" 的定义`, type: 'undefined' }
    
    // 添加到历史记录
    history.value.unshift({
      code: evalCode.value,
      result: result.value,
      timestamp: Date.now()
    })
    
    // 限制历史记录数量
    if (history.value.length > 10) {
      history.value = history.value.slice(0, 10)
    }
    
    // 保存到localStorage
    localStorage.setItem('eval-history', JSON.stringify(history.value))
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : '评估失败'
  } finally {
    loading.value = false
  }
}

function loadFromHistory(item: HistoryItem) {
  evalCode.value = item.code
  result.value = item.result
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

// 初始化
onMounted(() => {
  // 加载历史记录
  const savedHistory = localStorage.getItem('eval-history')
  if (savedHistory) {
    try {
      history.value = JSON.parse(savedHistory)
    } catch (e) {
      console.warn('Failed to load eval history:', e)
    }
  }
})

// 暴露给父组件
defineExpose({
  evalCode,
  result
})
</script>

<style scoped>
.eval-widget {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.eval-widget h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 2px solid #28a745;
  padding-bottom: 8px;
}

.eval-input {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}

.eval-input label {
  font-weight: 500;
  color: #555;
  min-width: 80px;
}

.eval-input-field {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn:hover {
  opacity: 0.9;
}

.eval-result {
  margin-bottom: 20px;
}

.eval-result h4 {
  margin: 0 0 12px 0;
  color: #555;
  font-size: 16px;
}

.result-container {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 12px;
  background-color: #f8f9fa;
  min-height: 100px;
  max-height: 400px;
  overflow-y: auto;
}

.loading {
  color: #007bff;
  font-style: italic;
}

.error {
  color: #dc3545;
  font-weight: 500;
}

.result-content {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.no-result {
  color: #6c757d;
  font-style: italic;
}

.eval-history h4 {
  margin: 0 0 12px 0;
  color: #555;
  font-size: 16px;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}

.history-item:hover {
  background-color: #f8f9fa;
}

.history-item:last-child {
  border-bottom: none;
}

.history-code {
  font-family: 'Courier New', monospace;
  font-weight: 500;
  color: #333;
}

.history-time {
  font-size: 12px;
  color: #6c757d;
}
</style>