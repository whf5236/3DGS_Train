<template>
  <div class="edit-widget">
    <h3>代码编辑器</h3>
    
    <!-- 滑块控制 -->
    <div class="sliders-section">
      <h4>参数滑块</h4>
      <div v-for="(slider, index) in sliders" :key="slider.id" class="slider-row">
        <input 
          v-model="slider.key" 
          type="text" 
          class="slider-name"
          placeholder="变量名"
        />
        <input 
          v-model.number="slider.value" 
          type="range" 
          :min="slider.minValue" 
          :max="slider.maxValue"
          step="0.01"
          class="slider-input"
        />
        <input 
          v-model.number="slider.minValue" 
          type="number" 
          class="slider-bound"
          step="0.1"
        />
        <input 
          v-model.number="slider.maxValue" 
          type="number" 
          class="slider-bound"
          step="0.1"
        />
        <button @click="removeSlider(index)" class="btn-remove">删除</button>
      </div>
      
      <!-- 添加新滑块 -->
      <div class="add-slider-row">
        <input v-model="newSlider.name" type="text" placeholder="变量名" class="slider-name" />
        <input v-model.number="newSlider.min" type="number" placeholder="最小值" class="slider-bound" />
        <input v-model.number="newSlider.val" type="number" placeholder="当前值" class="slider-bound" />
        <input v-model.number="newSlider.max" type="number" placeholder="最大值" class="slider-bound" />
        <button @click="addSlider" class="btn-add">添加滑块</button>
      </div>
    </div>

    <!-- 安全加载选项 -->
    <div class="control-group">
      <label>
        <input v-model="safeLoad" type="checkbox" />
        安全加载 (添加注释包装)
      </label>
    </div>

    <!-- 预设和历史 -->
    <div class="preset-controls">
      <button @click="showPresets = !showPresets" class="btn btn-secondary">
        浏览预设
      </button>
      <button @click="showHistory = !showHistory" class="btn btn-secondary">
        浏览历史
      </button>
    </div>

    <!-- 预设弹窗 -->
    <div v-if="showPresets" class="popup-overlay" @click="showPresets = false">
      <div class="popup-content" @click.stop>
        <h4>选择预设</h4>
        <div v-for="(preset, name) in presets" :key="name" class="preset-item">
          <button @click="loadPreset(name)" class="preset-btn">{{ name }}</button>
        </div>
        <button @click="showPresets = false" class="btn btn-secondary">关闭</button>
      </div>
    </div>

    <!-- 历史弹窗 -->
    <div v-if="showHistory" class="popup-overlay" @click="showHistory = false">
      <div class="popup-content" @click.stop>
        <h4>选择历史</h4>
        <div v-for="(history, name) in historyData" :key="name" class="preset-item">
          <button @click="loadHistory(name)" class="preset-btn">
            {{ name === currentSessionName ? '当前会话' : name }}
          </button>
        </div>
        <button @click="showHistory = false" class="btn btn-secondary">关闭</button>
      </div>
    </div>

    <!-- 代码编辑器 -->
    <div class="editor-section">
      <textarea 
        v-model="editText"
        class="code-editor"
        placeholder="在此输入Python代码..."
        spellcheck="false"
      ></textarea>
    </div>

    <!-- 保存预设 -->
    <div class="save-preset">
      <input 
        v-model="newPresetName" 
        type="text" 
        placeholder="预设名称"
        class="preset-name-input"
      />
      <button @click="savePreset" class="btn btn-primary" :disabled="!newPresetName.trim()">
        保存为预设
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'

interface Slider {
  id: string
  key: string
  value: number
  minValue: number
  maxValue: number
}

interface PresetData {
  editText: string
  slider: Slider[]
}

// 响应式数据
const sliders = ref<Slider[]>([])
const editText = ref(`gaussian._xyz = gaussian._xyz
gaussian._rotation = gaussian._rotation
gaussian._scaling = gaussian._scaling
gaussian._opacity = gaussian._opacity
gaussian._features_dc = gaussian._features_dc
gaussian._features_rest = gaussian._features_rest
self.bg_color[:] = 0`)

const safeLoad = ref(false)
const showPresets = ref(false)
const showHistory = ref(false)
const newPresetName = ref('')
const currentSessionName = ref(`恢复会话 ${new Date().toLocaleString()}`)

const newSlider = reactive({
  name: 'x',
  min: -10,
  val: 0,
  max: 10
})

const presets = ref<Record<string, PresetData>>({
  'Default': {
    editText: editText.value,
    slider: [{ id: '1', key: 'x', value: 1, minValue: 0, maxValue: 10 }]
  }
})

const historyData = ref<Record<string, PresetData>>({})

// 变量名生成
const varNames = 'xyzijklmnuvwabcdefghopqrst'
let varNameIndex = 1

// 方法
function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

function addSlider() {
  sliders.value.push({
    id: generateId(),
    key: newSlider.name,
    value: newSlider.val,
    minValue: newSlider.min,
    maxValue: newSlider.max
  })
  
  // 更新下一个变量名
  varNameIndex = (varNameIndex + 1) % varNames.length
  newSlider.name = varNames[varNameIndex]
}

function removeSlider(index: number) {
  sliders.value.splice(index, 1)
}

function loadPreset(name: string) {
  const preset = presets.value[name]
  if (preset) {
    editText.value = safeLoad.value ? 
      `''' # REMOVE THIS LINE\n${preset.editText}\n''' # REMOVE THIS LINE` : 
      preset.editText
    sliders.value = preset.slider.map(s => ({ ...s, id: generateId() }))
  }
  showPresets.value = false
}

function loadHistory(name: string) {
  const history = historyData.value[name]
  if (history) {
    editText.value = safeLoad.value ? 
      `''' # REMOVE THIS LINE\n${history.editText}\n''' # REMOVE THIS LINE` : 
      history.editText
    sliders.value = history.slider.map(s => ({ ...s, id: generateId() }))
  }
  showHistory.value = false
}

function savePreset() {
  if (!newPresetName.value.trim()) return
  
  presets.value[newPresetName.value] = {
    editText: editText.value,
    slider: sliders.value.map(s => ({ ...s }))
  }
  
  // 保存到localStorage
  localStorage.setItem('edit-presets', JSON.stringify(presets.value))
  newPresetName.value = ''
}

function saveToHistory() {
  historyData.value[currentSessionName.value] = {
    editText: editText.value,
    slider: sliders.value.map(s => ({ ...s }))
  }
  
  // 限制历史记录数量
  const historyKeys = Object.keys(historyData.value)
  if (historyKeys.length > 5) {
    const oldestKey = historyKeys.sort()[0]
    delete historyData.value[oldestKey]
  }
  
  localStorage.setItem('edit-history', JSON.stringify(historyData.value))
}

// 监听变化并保存到历史
watch([editText, sliders], saveToHistory, { deep: true })

// 初始化
onMounted(() => {
  // 加载预设
  const savedPresets = localStorage.getItem('edit-presets')
  if (savedPresets) {
    presets.value = JSON.parse(savedPresets)
  }
  
  // 加载历史
  const savedHistory = localStorage.getItem('edit-history')
  if (savedHistory) {
    historyData.value = JSON.parse(savedHistory)
  }
  
  // 初始化默认滑块
  if (sliders.value.length === 0) {
    addSlider()
  }
})

// 暴露给父组件的数据
defineExpose({
  editText,
  sliders: sliders.value.reduce((acc, slider) => {
    acc[slider.key] = slider.value
    return acc
  }, {} as Record<string, number>)
})
</script>

<style scoped>
.edit-widget {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.edit-widget h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 2px solid #17a2b8;
  padding-bottom: 8px;
}

.sliders-section {
  margin-bottom: 20px;
}

.sliders-section h4 {
  margin: 0 0 12px 0;
  color: #555;
  font-size: 14px;
}

.slider-row, .add-slider-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.slider-name {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
}

.slider-input {
  flex: 1;
  min-width: 100px;
}

.slider-bound {
  width: 60px;
  padding: 4px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
}

.btn-remove, .btn-add {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.btn-remove {
  background-color: #dc3545;
  color: white;
}

.btn-add {
  background-color: #28a745;
  color: white;
}

.control-group {
  margin-bottom: 16px;
}

.control-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #555;
}

.preset-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
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

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn:hover {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.popup-content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  max-width: 400px;
  max-height: 500px;
  overflow-y: auto;
}

.popup-content h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.preset-item {
  margin-bottom: 8px;
}

.preset-btn {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f8f9fa;
  cursor: pointer;
  text-align: left;
}

.preset-btn:hover {
  background-color: #e9ecef;
}

.editor-section {
  margin-bottom: 20px;
}

.code-editor {
  width: 100%;
  height: 300px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
  resize: vertical;
  background-color: #f8f9fa;
}

.save-preset {
  display: flex;
  gap: 12px;
  align-items: center;
}

.preset-name-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}
</style>