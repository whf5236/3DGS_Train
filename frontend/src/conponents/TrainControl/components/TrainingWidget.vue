<template>
  <div class="training-widget">
    <!-- 连接状态 -->
    <div class="connection-status">
      <div class="status-indicator" :class="{ 
        connected: trainControl?.isConnected, 
        disconnected: !trainControl?.isConnected 
      }"></div>
      <span>{{ trainControl?.isConnected ? 'WebSocket 已连接' : 'WebSocket 未连接' }}</span>
    </div>

    <!-- 训练控制 -->
    <div class="training-controls">
      <div class="control-buttons">
        <button 
          @click="trainControl?.pauseTraining()" 
          :disabled="!trainControl?.isConnected || !trainControl?.isTraining"
          class="btn btn-warning"
          title="暂停训练"
        >
          <i class="fas fa-pause"></i>
          暂停
        </button>
        <button 
          @click="trainControl?.resumeTraining()" 
          :disabled="!trainControl?.isConnected || trainControl?.isTraining"
          class="btn btn-success"
          title="继续训练"
        >
          <i class="fas fa-play"></i>
          继续
        </button>
        <button 
          @click="trainControl?.singleStepTraining()"
          :disabled="!trainControl?.isConnected"
          class="btn btn-info"
          title="执行单步训练"
        >
          <i class="fas fa-step-forward"></i>
          单步
        </button>
      </div>
      
      <div class="training-status">
        <div class="status-item">
          <label>当前迭代:</label>
          <span class="value">{{ trainControl?.currentIteration || 0 }}</span>
        </div>
        <div class="status-item">
          <label>状态:</label>
          <span class="value" :class="{ 
            training: trainControl?.isTraining, 
            paused: !trainControl?.isTraining && trainControl?.currentIteration > 0,
            disconnected: !trainControl?.isConnected
          }">
            {{ getTrainingStatusText() }}
          </span>
        </div>
        <div class="status-item">
          <label>高斯数量:</label>
          <span class="value">{{ getCurrentValue('num_gaussians') }}</span>
        </div>
        <div class="status-item">
          <label>损失值:</label>
          <span class="value">{{ getCurrentValue('loss') }}</span>
        </div>
      </div>
    </div>

    <!-- 控制选项 -->
    <div class="control-options">
      <div class="option-group">
        <label class="option-label">停止条件</label>
        <div class="input-group">
          <input 
            v-model.number="localStopAtValue" 
            @change="updateStopValue"
            type="number" 
            min="-1" 
            class="stop-input"
            placeholder="-1"
            :disabled="!trainControl?.isConnected"
          />
          <span class="input-hint">-1 表示不自动停止</span>
        </div>
      </div>

      <div class="option-group">
        <label class="checkbox-label">
          <input 
            v-model="localRenderGrad" 
            @change="updateRenderGrad"
            type="checkbox" 
            :disabled="!trainControl?.isConnected"
          />
          <span class="checkmark"></span>
          渲染梯度
        </label>
      </div>
    </div>

    <!-- 训练图表 -->
    <div class="training-charts">
      <div class="charts-header">
        <h3>训练图表</h3>
        <div class="chart-controls">
          <button @click="clearCharts" class="btn btn-sm btn-outline" title="清空图表数据">
            <i class="fas fa-trash"></i>
          </button>
          <button @click="exportChartData" class="btn btn-sm btn-outline" title="导出图表数据">
            <i class="fas fa-download"></i>
          </button>
        </div>
      </div>
      
      <div v-if="hasTrainingData" class="chart-grid">
        <div v-for="(chart, chartName) in charts" :key="chartName" class="chart-container">
          <div class="chart-header">
            <h4>{{ getChartTitle(chartName) }}</h4>
            <span class="current-value">
              当前值: {{ getCurrentValue(chartName) }}
            </span>
          </div>
          <canvas 
            :ref="el => chartRefs[chartName] = el"
            class="chart-canvas"
          ></canvas>
        </div>
      </div>
      
      <div v-else class="no-chart-data">
        <i class="fas fa-chart-line"></i>
        <p>暂无图表数据</p>
        <small>开始训练后将显示实时图表</small>
      </div>
    </div>

    <!-- 训练参数 -->
    <div class="training-params">
      <div class="params-header" @click="toggleParamsExpanded">
        <h3>
          <i class="fas" :class="paramsExpanded ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
          训练参数
        </h3>
        <span class="params-count">{{ Object.keys(trainControl?.trainingStats?.train_params || {}).length }} 项</span>
      </div>
      
      <div v-if="paramsExpanded" class="params-content">
        <div v-if="trainControl?.trainingStats?.train_params" class="params-grid">
          <div v-for="(value, key) in trainControl.trainingStats.train_params" :key="key" class="param-item">
            <label>{{ key }}:</label>
            <span class="param-value">{{ formatParamValue(value) }}</span>
          </div>
        </div>
        <div v-else class="no-params">
          <p>暂无参数数据</p>
        </div>
      </div>
    </div>

    <!-- 无数据提示 -->
    <div v-if="!trainControl?.isConnected" class="no-data">
      <i class="fas fa-plug"></i>
      <p>WebSocket 未连接</p>
      <small>请确保训练服务器正在运行并启用了 WebSocket 控制</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, inject, watch, computed } from 'vue'

interface TrainingStats {
  iteration: number
  num_gaussians: number
  loss: number
  sh_degree: number
  paused?: boolean
  train_params?: Record<string, any>
}

interface ChartData {
  values: number[]
  iterations: number[]
  color: string
  maxPoints: number
}

// 注入训练控制
const trainControl = inject<any>('trainControl')

// 本地状态
const localStopAtValue = ref(-1)
const localRenderGrad = ref(false)
const paramsExpanded = ref(false)

const charts = reactive<Record<string, ChartData>>({
  num_gaussians: { 
    values: [], 
    iterations: [], 
    color: '#3b82f6', 
    maxPoints: 500 
  },
  loss: { 
    values: [], 
    iterations: [], 
    color: '#ef4444', 
    maxPoints: 500 
  },
  sh_degree: { 
    values: [], 
    iterations: [], 
    color: '#10b981', 
    maxPoints: 500 
  }
})

const chartRefs = reactive<Record<string, HTMLCanvasElement | null>>({})

// 计算属性
const hasTrainingData = computed(() => {
  return trainControl?.trainingStats && Object.keys(charts).some(key => charts[key].values.length > 0)
})

// 方法
function updateStopValue() {
  if (trainControl) {
    trainControl.updateStopValue(localStopAtValue.value)
  }
}

function updateRenderGrad() {
  if (trainControl) {
    trainControl.toggleRenderGrad(localRenderGrad.value)
  }
}

function getTrainingStatusText() {
  if (!trainControl) return '未连接'
  if (!trainControl.isConnected) return '未连接'
  if (trainControl.isTraining) return '运行中'
  if (trainControl.currentIteration > 0) return '已暂停'
  return '未开始'
}

function toggleParamsExpanded() {
  paramsExpanded.value = !paramsExpanded.value
}

function clearCharts() {
  Object.keys(charts).forEach(key => {
    charts[key].values = []
    charts[key].iterations = []
  })
  drawCharts()
}

function exportChartData() {
  const data = {
    timestamp: new Date().toISOString(),
    charts: charts
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `training_data_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function updateTrainingStats(stats: TrainingStats) {
  if (!stats) return
  
  // 更新图表数据
  Object.keys(charts).forEach(key => {
    if (key in stats) {
      const value = stats[key as keyof TrainingStats] as number
      if (typeof value === 'number' && !isNaN(value)) {
        charts[key].values.push(value)
        charts[key].iterations.push(stats.iteration)
        
        // 限制数据点数量
        if (charts[key].values.length > charts[key].maxPoints) {
          charts[key].values.shift()
          charts[key].iterations.shift()
        }
      }
    }
  })
  
  // 重绘图表
  nextTick(() => {
    drawCharts()
  })
}

function drawCharts() {
  Object.keys(charts).forEach(chartName => {
    const canvas = chartRefs[chartName]
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const chart = charts[chartName]
    const width = canvas.width
    const height = canvas.height
    const padding = 20
    const plotWidth = width - 2 * padding
    const plotHeight = height - 2 * padding
    
    // 清空画布
    ctx.clearRect(0, 0, width, height)
    
    if (chart.values.length === 0) {
      // 绘制空状态
      ctx.fillStyle = '#9ca3af'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('暂无数据', width / 2, height / 2)
      return
    }
    
    // 计算数据范围
    const minValue = Math.min(...chart.values)
    const maxValue = Math.max(...chart.values)
    const valueRange = maxValue - minValue || 1
    
    const minIteration = Math.min(...chart.iterations)
    const maxIteration = Math.max(...chart.iterations)
    const iterationRange = maxIteration - minIteration || 1
    
    // 绘制背景
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(padding, padding, plotWidth, plotHeight)
    
    // 绘制网格
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    
    // 水平网格线
    for (let i = 0; i <= 5; i++) {
      const y = padding + (plotHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + plotWidth, y)
      ctx.stroke()
    }
    
    // 垂直网格线
    for (let i = 0; i <= 10; i++) {
      const x = padding + (plotWidth / 10) * i
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + plotHeight)
      ctx.stroke()
    }
    
    // 绘制数据线
    ctx.strokeStyle = chart.color
    ctx.lineWidth = 2
    ctx.beginPath()
    
    chart.values.forEach((value, index) => {
      const x = padding + ((chart.iterations[index] - minIteration) / iterationRange) * plotWidth
      const y = padding + plotHeight - ((value - minValue) / valueRange) * plotHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
    
    // 绘制数据点（最后几个点）
    if (chart.values.length > 0) {
      ctx.fillStyle = chart.color
      const lastIndex = chart.values.length - 1
      const x = padding + ((chart.iterations[lastIndex] - minIteration) / iterationRange) * plotWidth
      const y = padding + plotHeight - ((chart.values[lastIndex] - minValue) / valueRange) * plotHeight
      
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
    }
    
    // 绘制坐标轴标签
    ctx.fillStyle = '#64748b'
    ctx.font = '10px Arial'
    ctx.textAlign = 'left'
    
    // Y轴标签
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (valueRange / 5) * (5 - i)
      const y = padding + (plotHeight / 5) * i + 3
      ctx.fillText(formatAxisValue(value), 2, y)
    }
    
    // X轴标签
    ctx.textAlign = 'center'
    for (let i = 0; i <= 5; i++) {
      const iteration = minIteration + (iterationRange / 5) * i
      const x = padding + (plotWidth / 5) * i
      ctx.fillText(Math.round(iteration).toString(), x, height - 5)
    }
  })
}

function getChartTitle(chartName: string): string {
  const titles: Record<string, string> = {
    num_gaussians: '高斯数量',
    loss: '损失值',
    sh_degree: 'SH 度数'
  }
  return titles[chartName] || chartName
}

function formatParamValue(value: any): string {
  if (typeof value === 'number') {
    if (Math.abs(value) < 0.001 && value !== 0) {
      return value.toExponential(2)
    }
    if (value > 1000) {
      return value.toLocaleString()
    }
    return value.toFixed(4)
  }
  return String(value)
}

function formatAxisValue(value: number): string {
  if (Math.abs(value) < 0.001 && value !== 0) {
    return value.toExponential(1)
  }
  if (value > 1000) {
    return (value / 1000).toFixed(1) + 'k'
  }
  return value.toFixed(2)
}

function getCurrentValue(chartName: string): string {
  const chart = charts[chartName]
  if (chart.values.length === 0) return '-'
  return formatParamValue(chart.values[chart.values.length - 1])
}

// 监听训练控制状态变化
watch(() => trainControl?.trainingStats, (newStats) => {
  if (newStats) {
    updateTrainingStats(newStats)
  }
}, { deep: true })

// 监听本地状态变化
watch(localStopAtValue, updateStopValue)
watch(localRenderGrad, updateRenderGrad)

// 生命周期
onMounted(() => {
  nextTick(() => {
    // 设置画布尺寸
    Object.keys(chartRefs).forEach(key => {
      const canvas = chartRefs[key]
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * window.devicePixelRatio
        canvas.height = rect.height * window.devicePixelRatio
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
        }
      }
    })
    drawCharts()
  })
})

onUnmounted(() => {
  // 清理资源
})

// 暴露给父组件（如果父组件需要直接访问这些方法）
defineExpose({
  clearCharts,
  exportChartData
})
</script>

<style scoped>
.training-widget {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
  animation: pulse 2s infinite;
}

.status-indicator.connected {
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.training-controls {
  margin-bottom: 24px;
}

.control-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.btn-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.btn-info {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-outline {
  background: white;
  border: 1px solid #d1d5db;
  color: #6b7280;
}

.btn-outline:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.training-status {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.status-item label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-item .value {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.value.training {
  color: #10b981;
}

.value.paused {
  color: #f59e0b;
}

.value.disconnected {
  color: #ef4444;
}

.control-options {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  flex-wrap: wrap;
}

.option-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.option-label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stop-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  width: 200px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.stop-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.stop-input:disabled {
  background: #f3f4f6;
  color: #9ca3af;
}

.input-hint {
  font-size: 12px;
  color: #6b7280;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.checkmark {
  margin-left: 4px;
}

.training-charts {
  margin-bottom: 24px;
}

.charts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.charts-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 18px;
  font-weight: 600;
}

.chart-controls {
  display: flex;
  gap: 8px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.chart-container {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.chart-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.current-value {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.chart-canvas {
  width: 100%;
  height: 200px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fafafa;
}

.no-chart-data {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.no-chart-data i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-chart-data p {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
}

.no-chart-data small {
  font-size: 14px;
  opacity: 0.8;
}

.training-params {
  margin-bottom: 24px;
}

.params-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  cursor: pointer;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: background-color 0.2s;
}

.params-header:hover {
  background: #f1f5f9;
}

.params-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.params-count {
  font-size: 12px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 4px 8px;
  border-radius: 12px;
}

.params-content {
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.param-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #e5e7eb;
}

.param-item:last-child {
  border-bottom: none;
}

.param-item label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.param-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  font-family: 'Monaco', 'Menlo', monospace;
}

.no-params {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
}

.no-data {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.no-data i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-data p {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 500;
}

.no-data small {
  font-size: 14px;
  opacity: 0.8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .training-widget {
    padding: 16px;
  }
  
  .control-buttons {
    flex-direction: column;
  }
  
  .control-options {
    flex-direction: column;
    gap: 16px;
  }
  
  .chart-grid {
    grid-template-columns: 1fr;
  }
  
  .params-grid {
    grid-template-columns: 1fr;
  }
}
</style>