<template>
  <div class="performance-widget">
    <h3>性能监控</h3>
    
    <!-- FPS 图表 -->
    <div class="fps-chart">
      <canvas ref="fpsCanvas" width="400" height="200"></canvas>
    </div>

    <!-- FPS 控制 -->
    <div class="fps-controls">
      <div class="control-group">
        <label for="fpsLimit">GUI FPS 限制:</label>
        <input 
          id="fpsLimit"
          v-model.number="fpsLimit" 
          type="number" 
          min="5" 
          max="1000"
          class="fps-input"
        />
      </div>
      
      <div class="control-group">
        <label>
          <input v-model="useVsync" type="checkbox" />
          垂直同步
        </label>
      </div>
    </div>

    <!-- FPS 显示 -->
    <div class="fps-display">
      <div class="fps-item">
        <span class="fps-label">GUI FPS:</span>
        <span class="fps-value">{{ currentGuiFps.toFixed(2) }}</span>
      </div>
      <div class="fps-item">
        <span class="fps-label">渲染 FPS:</span>
        <span class="fps-value">{{ currentRenderFps.toFixed(2) }}</span>
      </div>
    </div>

    <!-- 设备信息 -->
    <div class="device-info">
      <h4>设备信息</h4>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">设备:</span>
          <span class="info-value">{{ deviceInfo.name }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">设备能力:</span>
          <span class="info-value">{{ deviceInfo.capability }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">驱动版本:</span>
          <span class="info-value">{{ deviceInfo.driver }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">CUDA 版本:</span>
          <span class="info-value">{{ deviceInfo.cudaVersion }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">时钟频率:</span>
          <span class="info-value">{{ deviceInfo.clockRate }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">温度:</span>
          <span class="info-value">{{ deviceInfo.temperature }}° C</span>
        </div>
      </div>
    </div>

    <!-- 内存使用 -->
    <div class="memory-info">
      <h4>内存使用</h4>
      <div class="memory-bar">
        <div 
          class="memory-used" 
          :style="{ width: `${memoryUsagePercent}%` }"
        ></div>
        <span class="memory-text">
          {{ (deviceInfo.memoryUsed / 1024).toFixed(2) }}GB / {{ (deviceInfo.memoryTotal / 1024).toFixed(2) }}GB
        </span>
      </div>
      <button @click="clearCache" class="btn btn-warning">清空缓存</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 响应式数据
const fpsLimit = ref(0)
const useVsync = ref(false)
const currentGuiFps = ref(0)
const currentRenderFps = ref(0)

const fpsCanvas = ref<HTMLCanvasElement | null>(null)

// FPS 历史数据
const guiFpsHistory = ref<number[]>(new Array(100).fill(0))
const renderFpsHistory = ref<number[]>(new Array(100).fill(0))

// 设备信息
const deviceInfo = ref({
  name: 'NaN',
  capability: 'NaN',
  driver: '',
  cudaVersion: '',
  clockRate: '',
  temperature: 0,
  memoryUsed: 0, // MB
  memoryTotal: 0 // MB
})

// 计算属性
const memoryUsagePercent = computed(() => {
  return (deviceInfo.value.memoryUsed / deviceInfo.value.memoryTotal) * 100
})

// 定时器
let fpsUpdateTimer: number | null = null
let deviceUpdateTimer: number | null = null

// 方法
function updateFpsData() {
  // 模拟FPS数据更新
  const newGuiFps = 60 
  const newRenderFps = 45 
  // fps这里需要从后端获取
  
  currentGuiFps.value = newGuiFps
  currentRenderFps.value = newRenderFps
  
  // 更新历史数据
  guiFpsHistory.value.shift()
  guiFpsHistory.value.push(newGuiFps)
  
  renderFpsHistory.value.shift()
  renderFpsHistory.value.push(newRenderFps)
  
  // 绘制图表
  drawFpsChart()
}

function updateDeviceInfo() {
  // 模拟设备信息更新
  // deviceInfo.value.temperature = 45 + Math.random() * 20
  // deviceInfo.value.memoryUsed = 2048 + Math.random() * 1024
  // 这里不对啊，应该是后端发送的
}

function drawFpsChart() {
  if (!fpsCanvas.value) return
  
  const canvas = fpsCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const width = canvas.width
  const height = canvas.height
  
  // 清空画布
  ctx.clearRect(0, 0, width, height)
  
  // 绘制背景网格
  ctx.strokeStyle = '#e9ecef'
  ctx.lineWidth = 1
  
  // 水平网格线
  for (let i = 0; i <= 4; i++) {
    const y = (height / 4) * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  
  // 垂直网格线
  for (let i = 0; i <= 10; i++) {
    const x = (width / 10) * i
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  
  // 绘制FPS曲线
  const maxFps = 100
  const stepX = width / (guiFpsHistory.value.length - 1)
  
  // GUI FPS 曲线
  ctx.strokeStyle = '#007bff'
  ctx.lineWidth = 2
  ctx.beginPath()
  guiFpsHistory.value.forEach((fps, index) => {
    const x = index * stepX
    const y = height - (fps / maxFps) * height
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()
  
  // 渲染 FPS 曲线
  ctx.strokeStyle = '#28a745'
  ctx.lineWidth = 2
  ctx.beginPath()
  renderFpsHistory.value.forEach((fps, index) => {
    const x = index * stepX
    const y = height - (fps / maxFps) * height
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()
  
  // 绘制图例
  ctx.font = '12px Arial'
  ctx.fillStyle = '#007bff'
  ctx.fillText('GUI', 10, 20)
  ctx.fillStyle = '#28a745'
  ctx.fillText('渲染', 50, 20)
}

function clearCache() {
  // 模拟清空缓存
  deviceInfo.value.memoryUsed = Math.max(1024, deviceInfo.value.memoryUsed * 0.3)
  console.log('缓存已清空')
}

// 生命周期
onMounted(() => {
  // 启动定时器
  fpsUpdateTimer = window.setInterval(updateFpsData, 100)
  deviceUpdateTimer = window.setInterval(updateDeviceInfo, 1000)
  
  // 初始绘制
  drawFpsChart()
})

onUnmounted(() => {
  // 清理定时器
  if (fpsUpdateTimer) {
    clearInterval(fpsUpdateTimer)
  }
  if (deviceUpdateTimer) {
    clearInterval(deviceUpdateTimer)
  }
})

// 暴露给父组件
defineExpose({
  fpsLimit,
  useVsync,
  currentGuiFps,
  currentRenderFps
})
</script>

<style scoped>
.performance-widget {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
}

.performance-widget h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 2px solid #dc3545;
  padding-bottom: 8px;
}

.fps-chart {
  margin-bottom: 20px;
  text-align: center;
}

.fps-chart canvas {
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f8f9fa;
}

.fps-controls {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  align-items: center;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group label {
  font-size: 14px;
  color: #555;
  white-space: nowrap;
}

.fps-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.fps-display {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.fps-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.fps-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.fps-value {
  font-size: 24px;
  font-weight: 600;
  color: #007bff;
}

.gpu-info h4 {
  margin: 0 0 12px 0;
  color: #555;
  font-size: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.info-label {
  font-weight: 500;
  color: #555;
}

.info-value {
  color: #333;
  font-family: 'Courier New', monospace;
}

.memory-usage {
  margin-top: 16px;
}

.memory-label {
  font-weight: 500;
  color: #555;
  margin-bottom: 8px;
}

.memory-bar {
  position: relative;
  height: 30px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.memory-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745, #ffc107, #dc3545);
  transition: width 0.3s ease;
}

.memory-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: 500;
  color: #333;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
}

.btn:hover {
  opacity: 0.9;
}
</style>