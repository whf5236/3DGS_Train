<template>
  <div class="render-widget">
    <h3>渲染设置</h3>
    
    <!-- 分辨率设置 -->
    <div class="control-group">
      <label for="resolution">分辨率:</label>
      <input 
        id="resolution"
        v-model.number="resolution" 
        type="number" 
        step="64"
        min="64"
        max="4096"
        class="number-input"
      />
    </div>

    <!-- 背景颜色 -->
    <div class="control-group">
      <label for="backgroundColor">背景颜色:</label>
      <input 
        id="backgroundColor"
        v-model="backgroundColorHex" 
        type="color"
        class="color-input"
      />
    </div>

    <!-- 渲染选项 -->
    <div class="render-options">
      <div class="option-group">
        <label>
          <input v-model="imgNormalize" type="checkbox" />
          图像归一化
        </label>
      </div>
      
      <div class="option-group">
        <label>
          <input 
            v-model="renderAlpha" 
            type="checkbox"
            @change="onAlphaChange"
          />
          渲染透明度
        </label>
      </div>
      
      <div class="option-group">
        <label>
          <input 
            v-model="renderDepth" 
            type="checkbox"
            @change="onDepthChange"
          />
          渲染深度
        </label>
      </div>
      
      <div class="option-group">
        <label>
          <input v-model="invertColors" type="checkbox" />
          反转颜色
        </label>
      </div>
    </div>

    <!-- 颜色映射 -->
    <div class="control-group">
      <label for="colormap">颜色映射:</label>
      <select id="colormap" v-model="currentColormap" class="select-input">
        <option v-for="(colormap, index) in colormaps" :key="index" :value="index">
          {{ colormap.name }}
        </option>
      </select>
    </div>

    <!-- 预览 -->
    <div class="preview-section">
      <h4>预览设置</h4>
      <div class="preview-info">
        <div class="info-item">
          <span>分辨率:</span>
          <span>{{ resolution }}x{{ resolution }}</span>
        </div>
        <div class="info-item">
          <span>背景:</span>
          <div 
            class="color-preview" 
            :style="{ backgroundColor: backgroundColorHex }"
          ></div>
        </div>
        <div class="info-item">
          <span>模式:</span>
          <span>{{ renderModeText }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// 颜色映射选项
const colormaps = [
  { name: 'NONE', value: null },
  { name: 'AUTUMN', value: 'autumn' },
  { name: 'BONE', value: 'bone' },
  { name: 'JET', value: 'jet' },
  { name: 'WINTER', value: 'winter' },
  { name: 'RAINBOW', value: 'rainbow' },
  { name: 'OCEAN', value: 'ocean' },
  { name: 'SUMMER', value: 'summer' },
  { name: 'SPRING', value: 'spring' },
  { name: 'COOL', value: 'cool' },
  { name: 'HSV', value: 'hsv' },
  { name: 'PINK', value: 'pink' },
  { name: 'HOT', value: 'hot' },
  { name: 'PARULA', value: 'parula' },
  { name: 'MAGMA', value: 'magma' },
  { name: 'INFERNO', value: 'inferno' },
  { name: 'PLASMA', value: 'plasma' },
  { name: 'VIRIDIS', value: 'viridis' },
  { name: 'CIVIDIS', value: 'cividis' },
  { name: 'TWILIGHT', value: 'twilight' },
  { name: 'TWILIGHT_SHIFTED', value: 'twilight_shifted' },
  { name: 'TURBO', value: 'turbo' },
  { name: 'DEEPGREEN', value: 'deepgreen' }
]

// 响应式数据
const resolution = ref(1024)
const backgroundColor = ref([1.0, 1.0, 1.0])
const imgNormalize = ref(false)
const renderAlpha = ref(false)
const renderDepth = ref(false)
const invertColors = ref(false)
const currentColormap = ref(0)

// 计算属性
const backgroundColorHex = computed({
  get: () => {
    const r = Math.round(backgroundColor.value[0] * 255)
    const g = Math.round(backgroundColor.value[1] * 255)
    const b = Math.round(backgroundColor.value[2] * 255)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  },
  set: (value: string) => {
    const hex = value.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16) / 255
    const g = parseInt(hex.substr(2, 2), 16) / 255
    const b = parseInt(hex.substr(4, 2), 16) / 255
    backgroundColor.value = [r, g, b]
  }
})

const renderModeText = computed(() => {
  if (renderAlpha.value) return '透明度模式'
  if (renderDepth.value) return '深度模式'
  return '标准模式'
})

const selectedColormap = computed(() => {
  return colormaps[currentColormap.value]
})

// 方法
function onAlphaChange() {
  if (renderAlpha.value) {
    renderDepth.value = false
  }
}

function onDepthChange() {
  if (renderDepth.value) {
    renderAlpha.value = false
  }
}

// 监听变化并发送给父组件
const emit = defineEmits<{
  'settings-change': [settings: {
    resolution: number
    backgroundColor: number[]
    imgNormalize: boolean
    renderAlpha: boolean
    renderDepth: boolean
    invertColors: boolean
    colormap: string | null
  }]
}>()

watch(
  [resolution, backgroundColor, imgNormalize, renderAlpha, renderDepth, invertColors, currentColormap],
  () => {
    emit('settings-change', {
      resolution: resolution.value,
      backgroundColor: backgroundColor.value,
      imgNormalize: imgNormalize.value,
      renderAlpha: renderAlpha.value,
      renderDepth: renderDepth.value,
      invertColors: invertColors.value,
      colormap: selectedColormap.value.value
    })
  },
  { deep: true, immediate: true }
)

// 暴露给父组件
defineExpose({
  resolution,
  backgroundColor,
  imgNormalize,
  renderAlpha,
  renderDepth,
  invertColors,
  colormap: selectedColormap
})
</script>

<style scoped>
.render-widget {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
}

.render-widget h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 2px solid #6f42c1;
  padding-bottom: 8px;
}

.control-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.control-group label {
  font-size: 14px;
  color: #555;
  font-weight: 500;
}

.number-input {
  width: 100px;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.color-input {
  width: 60px;
  height: 35px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.select-input {
  width: 150px;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}

.render-options {
  margin-bottom: 20px;
}

.option-group {
  margin-bottom: 12px;
}

.option-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #555;
  cursor: pointer;
}

.option-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.preview-section {
  border-top: 1px solid #e9ecef;
  padding-top: 16px;
}

.preview-section h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 14px;
}

.info-item span:first-child {
  color: #555;
  font-weight: 500;
}

.info-item span:last-child {
  color: #333;
  font-family: 'Courier New', monospace;
}

.color-preview {
  width: 20px;
  height: 20px;
  border: 1px solid #ddd;
  border-radius: 3px;
}
</style>