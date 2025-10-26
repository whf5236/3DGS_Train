<template>
  <div class="object-viewer" :style="{ marginLeft: `${depth * 20}px` }">
    <div v-if="isPrimitive" class="primitive-value">
      <span class="key">{{ objectName }}:</span>
      <span class="value" :class="getValueClass()">{{ formatValue() }}</span>
    </div>
    
    <div v-else class="complex-object">
      <div class="object-header" @click="toggleExpanded">
        <span class="expand-icon" :class="{ expanded: isExpanded }">▶</span>
        <span class="object-name">{{ objectName || 'Object' }}</span>
        <span class="object-type">({{ getObjectType() }})</span>
      </div>
      
      <div v-if="isExpanded" class="object-content">
        <ObjectViewer
          v-for="[key, value] in sortedEntries"
          :key="key"
          :data="value"
          :depth="depth + 1"
          :object-name="key"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  data: any
  depth: number
  objectName: string
}

const props = defineProps<Props>()

const isExpanded = ref(props.depth < 2) // 默认展开前两层

const isPrimitive = computed(() => {
  const data = props.data
  return data === null || 
         data === undefined || 
         typeof data === 'string' || 
         typeof data === 'number' || 
         typeof data === 'boolean' ||
         typeof data === 'function'
})

const sortedEntries = computed(() => {
  if (isPrimitive.value) return []
  
  const data = props.data
  let entries: [string, any][] = []
  
  if (Array.isArray(data)) {
    entries = data.map((item, index) => [index.toString(), item])
  } else if (typeof data === 'object' && data !== null) {
    entries = Object.entries(data)
  }
  
  // 按类型和名称排序
  return entries.sort(([keyA, valueA], [keyB, valueB]) => {
    const typeA = getValueType(valueA)
    const typeB = getValueType(valueB)
    
    if (typeA !== typeB) {
      return typeA.localeCompare(typeB)
    }
    
    return keyA.localeCompare(keyB)
  })
})

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

function getObjectType(): string {
  const data = props.data
  
  if (Array.isArray(data)) {
    return `Array[${data.length}]`
  } else if (data && typeof data === 'object') {
    if (data.shape && data.dtype) {
      return `Tensor ${JSON.stringify(data.shape)} ${data.dtype}`
    }
    return `Object{${Object.keys(data).length}}`
  }
  
  return typeof data
}

function getValueType(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return typeof value
}

function getValueClass(): string {
  const data = props.data
  
  if (data === null || data === undefined) return 'null-value'
  if (typeof data === 'string') return 'string-value'
  if (typeof data === 'number') return 'number-value'
  if (typeof data === 'boolean') return 'boolean-value'
  if (typeof data === 'function') return 'function-value'
  
  return 'default-value'
}

function formatValue(): string {
  const data = props.data
  
  if (data === null) return 'null'
  if (data === undefined) return 'undefined'
  if (typeof data === 'string') return `"${data}"`
  if (typeof data === 'number') {
    return Number.isInteger(data) ? data.toString() : data.toFixed(6)
  }
  if (typeof data === 'boolean') return data.toString()
  if (typeof data === 'function') return 'function'
  
  return String(data)
}
</script>

<style scoped>
.object-viewer {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.primitive-value {
  display: flex;
  gap: 8px;
  padding: 2px 0;
}

.key {
  color: #0066cc;
  font-weight: 500;
}

.value {
  font-weight: 400;
}

.string-value {
  color: #008000;
}

.number-value {
  color: #ff6600;
}

.boolean-value {
  color: #cc0066;
}

.function-value {
  color: #9900cc;
  font-style: italic;
}

.null-value {
  color: #999;
  font-style: italic;
}

.default-value {
  color: #333;
}

.complex-object {
  margin: 2px 0;
}

.object-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.object-header:hover {
  background-color: #f0f0f0;
}

.expand-icon {
  color: #666;
  font-size: 10px;
  transition: transform 0.2s;
  user-select: none;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.object-name {
  color: #0066cc;
  font-weight: 500;
}

.object-type {
  color: #666;
  font-size: 11px;
  font-style: italic;
}

.object-content {
  margin-left: 16px;
  border-left: 1px solid #e0e0e0;
  padding-left: 8px;
}
</style>