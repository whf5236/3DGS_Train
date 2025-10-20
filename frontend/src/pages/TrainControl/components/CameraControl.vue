<template>
  <div class="camera-control">
    <h3>相机控制</h3>
    
    <!-- 相机模式选择 -->
    <div class="control-group">
      <label>相机模式</label>
      <select v-model="cameraMode" @change="onCameraModeChange">
        <option value="orbit">轨道模式 (Orbit)</option>
        <option value="wasd">自由模式 (WASD)</option>
      </select>
    </div>

    <!-- 显示移动选项开关 -->
    <div class="control-group">
      <label class="checkbox-label">
        <input 
          type="checkbox" 
          v-model="showMovementOptions"
        >
        显示移动选项
      </label>
    </div>

    <!-- 移动选项 -->
    <div v-if="showMovementOptions" class="movement-options">
      <div v-if="cameraMode === 'wasd'" class="control-group">
        <label>移动速度</label>
        <input 
          type="range" 
          v-model.number="wasdMoveSpeed" 
          min="0.001" 
          max="1" 
          step="0.001"
          class="slider"
        >
        <span class="value-display">{{ wasdMoveSpeed.toFixed(3) }}</span>
      </div>

      <div class="control-group">
        <label>拖拽速度</label>
        <input 
          type="range" 
          v-model.number="dragSpeed" 
          min="0.001" 
          max="0.1" 
          step="0.001"
          class="slider"
        >
        <span class="value-display">{{ dragSpeed.toFixed(3) }}</span>
      </div>

      <div class="control-group">
        <label>动量</label>
        <input 
          type="range" 
          v-model.number="momentum" 
          min="0" 
          max="0.999" 
          step="0.001"
          class="slider"
        >
        <span class="value-display">{{ momentum.toFixed(3) }}</span>
      </div>

      <div class="control-group">
        <label>动量衰减</label>
        <input 
          type="range" 
          v-model.number="momentumDropoff" 
          min="0" 
          max="1" 
          step="0.001"
          class="slider"
        >
        <span class="value-display">{{ momentumDropoff.toFixed(3) }}</span>
      </div>

      <div class="control-group">
        <label>旋转速度</label>
        <input 
          type="range" 
          v-model.number="rotateSpeed" 
          min="0.001" 
          max="0.1" 
          step="0.001"
          class="slider"
        >
        <span class="value-display">{{ rotateSpeed.toFixed(3) }}</span>
      </div>

      <div class="control-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="invertX">
          反转X轴
        </label>
      </div>

      <div class="control-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="invertY">
          反转Y轴
        </label>
      </div>
    </div>

    <!-- 相机矩阵 -->
    <div class="camera-matrix-section">
      <h4>相机矩阵</h4>
      
      <div class="control-group">
        <label>上方向向量</label>
        <div class="vector-input">
          <input 
            type="number" 
            v-model.number="upVector.x" 
            step="0.1"
            @input="onUpVectorChange"
          >
          <input 
            type="number" 
            v-model.number="upVector.y" 
            step="0.1"
            @input="onUpVectorChange"
          >
          <input 
            type="number" 
            v-model.number="upVector.z" 
            step="0.1"
            @input="onUpVectorChange"
          >
        </div>
        <div class="button-group">
          <button @click="setCurrentDirection" class="btn btn-sm">设置当前方向</button>
          <button @click="flipUpVector" class="btn btn-sm">翻转</button>
        </div>
      </div>

      <div class="control-group">
        <label>视野角度 (FOV)</label>
        <input 
          type="range" 
          v-model.number="fov" 
          min="1" 
          max="180" 
          step="1"
          class="slider"
        >
        <input 
          type="number" 
          v-model.number="fov" 
          min="1" 
          max="180" 
          step="0.1"
          class="number-input"
        >
        <span class="value-display">{{ fov.toFixed(1) }}°</span>
      </div>

      <!-- 轨道模式特有控制 -->
      <div v-if="cameraMode === 'orbit'" class="orbit-controls">
        <div class="control-group">
          <label>相机位置 (偏航角, 俯仰角)</label>
          <div class="vector-input">
            <input 
              type="number" 
              v-model.number="pose.yaw" 
              step="0.1"
              @input="onPoseChange"
            >
            <input 
              type="number" 
              v-model.number="pose.pitch" 
              step="0.1"
              @input="onPoseChange"
            >
          </div>
        </div>

        <div class="control-group">
          <label>半径</label>
          <input 
            type="range" 
            v-model.number="radius" 
            min="1" 
            max="20" 
            step="0.1"
            class="slider"
          >
          <input 
            type="number" 
            v-model.number="radius" 
            min="1" 
            max="20" 
            step="0.1"
            class="number-input"
          >
          <span class="value-display">{{ radius.toFixed(2) }}</span>
        </div>

        <div class="control-group">
          <label>观察点</label>
          <div class="vector-input">
            <input 
              type="number" 
              v-model.number="lookatPoint.x" 
              step="0.1"
              @input="onLookatChange"
            >
            <input 
              type="number" 
              v-model.number="lookatPoint.y" 
              step="0.1"
              @input="onLookatChange"
            >
            <input 
              type="number" 
              v-model.number="lookatPoint.z" 
              step="0.1"
              @input="onLookatChange"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- 显示外参矩阵 -->
    <div class="control-group">
      <label class="checkbox-label">
        <input type="checkbox" v-model="showExtrinsics">
        显示外参矩阵
      </label>
    </div>

    <div v-if="showExtrinsics" class="extrinsics-matrix">
      <h4>外参矩阵</h4>
      <div class="matrix-row" v-for="(row, i) in cameraMatrix" :key="i">
        <input 
          v-for="(val, j) in row" 
          :key="j"
          type="number" 
          :value="val.toFixed(4)" 
          readonly
          class="matrix-input"
        >
      </div>
    </div>

    <!-- 控制说明 -->
    <div class="controls-help">
      <h4>控制说明</h4>
      <div class="help-text">
        <p><strong>鼠标控制:</strong></p>
        <ul>
          <li>左键拖拽: 旋转视角</li>
          <li>右键/中键拖拽: 平移相机</li>
          <li>滚轮: 缩放/前进后退</li>
        </ul>
        <p><strong>键盘控制 (WASD模式):</strong></p>
        <ul>
          <li>W/S: 前进/后退</li>
          <li>A/D: 左移/右移</li>
          <li>Q/E: 上升/下降</li>
        </ul>
        <p><strong>键盘控制 (轨道模式):</strong></p>
        <ul>
          <li>W/S: 俯仰角调整</li>
          <li>A/D: 偏航角调整</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { Math3D, type Matrix4 } from '@/utils/math3d'
// Props
interface Props {
  canvas?: HTMLCanvasElement | null
}

const props = withDefaults(defineProps<Props>(), {
  canvas: null
})

// Emits
const emit = defineEmits<{
  cameraUpdate: [params: CameraParams]
}>()

// Types
interface Vector3 {
  x: number
  y: number
  z: number
}

interface Pose {
  yaw: number
  pitch: number
}

interface CameraParams {
  fov: number
  pose: Pose
  cameraMatrix: number[][]
  lookatPoint: Vector3
  upVector: Vector3
  cameraMode: string
}

// Reactive data
const cameraMode = ref<'orbit' | 'wasd'>('wasd')
const showMovementOptions = ref(false)
const showExtrinsics = ref(false)

// Movement controls
const wasdMoveSpeed = ref(0.1)
const dragSpeed = ref(0.005)
const rotateSpeed = ref(0.002)
const momentum = ref(0.3)
const momentumDropoff = ref(0.8)
const invertX = ref(false)
const invertY = ref(false)

// Camera parameters
const fov = ref(60)
const radius = ref(1)
const pose = reactive<Pose>({ yaw: Math.PI, pitch: 0 })
const upVector = reactive<Vector3>({ x: 0, y: -1, z: 0 })
const lookatPoint = reactive<Vector3>({ x: 0, y: 0, z: 0 })
const cameraPos = reactive<Vector3>({ x: 0, y: 0, z: -1 })
const forward = reactive<Vector3>({ x: 0, y: 0, z: 1 })

// Momentum tracking
const momentumX = ref(0)
const momentumY = ref(0)
const lastDragDelta = reactive({ x: 0, y: 0 })

// Pressed keys tracking
const pressedKeys = ref(new Set<string>())

// Computed camera matrix
const cameraMatrix = computed(() => {
  let viewMatrix: Matrix4
  
  if (cameraMode.value === 'orbit') {
    // 轨道模式：相机围绕观察点旋转
    const cameraPosition = Math3D.getOrbitPosition(
      pose.yaw + Math.PI / 2,
      pose.pitch + Math.PI / 2,
      radius.value,
      lookatPoint
    )
    
    viewMatrix = Math3D.lookAt(cameraPosition, lookatPoint, upVector)
    
    // 更新相机位置
    cameraPos.x = cameraPosition.x
    cameraPos.y = cameraPosition.y
    cameraPos.z = cameraPosition.z
    
    // 更新前向向量
    const forwardVec = Math3D.normalize(Math3D.subtract(lookatPoint, cameraPosition))
    forward.x = forwardVec.x
    forward.y = forwardVec.y
    forward.z = forwardVec.z
  } else {
    // WASD模式：自由相机
    const forwardVec = Math3D.getForwardVector(pose.yaw, pose.pitch)
    forward.x = forwardVec.x
    forward.y = forwardVec.y
    forward.z = forwardVec.z
    
    const target = Math3D.add(cameraPos, forwardVec)
    viewMatrix = Math3D.lookAt(cameraPos, target, upVector)
  }
  
  return Math3D.toArray4x4(viewMatrix)
})

// Methods
function onCameraModeChange() {
  updateCameraParams()
}

function onUpVectorChange() {
  updateCameraParams()
}

function onPoseChange() {
  // Clamp pitch to prevent gimbal lock
  pose.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pose.pitch))
  updateCameraParams()
}

function onLookatChange() {
  updateCameraParams()
}

function setCurrentDirection() {
  upVector.x = -forward.x
  upVector.y = -forward.y
  upVector.z = -forward.z
  pose.yaw = 0
  pose.pitch = 0
  updateCameraParams()
}

function flipUpVector() {
  upVector.x = -upVector.x
  upVector.y = -upVector.y
  upVector.z = -upVector.z
  updateCameraParams()
}

function updateCameraParams() {
  const params: CameraParams = {
    fov: fov.value,
    pose: { ...pose },
    cameraMatrix: cameraMatrix.value,
    lookatPoint: { ...lookatPoint },
    upVector: { ...upVector },
    cameraMode: cameraMode.value
  }
  emit('cameraUpdate', params)
}

// Mouse and keyboard event handlers
function handleMouseDown(event: MouseEvent) {
  if (!props.canvas) return
  
  const rect = props.canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // Check if click is within canvas
  if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
    lastDragDelta.x = event.clientX
    lastDragDelta.y = event.clientY
  }
}

function handleMouseMove(event: MouseEvent) {
  if (!props.canvas) return
  
  const rect = props.canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // Check if mouse is within canvas
  if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
    if (event.buttons === 1) { // Left mouse button
      const deltaX = event.clientX - lastDragDelta.x
      const deltaY = event.clientY - lastDragDelta.y
      
      const xDir = invertX.value ? -1 : 1
      const yDir = invertY.value ? -1 : 1
      
      momentumX.value = xDir * deltaX * rotateSpeed.value * (1 - momentum.value) + (momentumX.value * momentum.value)
      momentumY.value = yDir * deltaY * rotateSpeed.value * (1 - momentum.value) + (momentumY.value * momentum.value)
      
      lastDragDelta.x = event.clientX
      lastDragDelta.y = event.clientY
    } else if (event.buttons === 2 || event.buttons === 4) { // Right or middle mouse button
      const deltaX = event.clientX - lastDragDelta.x
      const deltaY = event.clientY - lastDragDelta.y
      
      const xDir = invertX.value ? -1 : 1
      const yDir = invertY.value ? -1 : 1
      
      // 计算正确的右向和上向向量
      const forwardVec = Math3D.getForwardVector(pose.yaw, pose.pitch)
      const rightVec = Math3D.normalize(Math3D.cross(forwardVec, upVector))
      const upVec = Math3D.normalize(Math3D.cross(rightVec, forwardVec))
      
      // 相机平移
      const xMovement = Math3D.scale(rightVec, xDir * deltaX * dragSpeed.value)
      const yMovement = Math3D.scale(upVec, yDir * deltaY * dragSpeed.value)
      
      cameraPos.x += xMovement.x + yMovement.x
      cameraPos.y += xMovement.y + yMovement.y
      cameraPos.z += xMovement.z + yMovement.z
      
      if (cameraMode.value === 'orbit') {
        lookatPoint.x += xMovement.x + yMovement.x
        lookatPoint.y += xMovement.y + yMovement.y
        lookatPoint.z += xMovement.z + yMovement.z
      }
      
      lastDragDelta.x = event.clientX
      lastDragDelta.y = event.clientY
      updateCameraParams()
    }
  }
}

function handleMouseUp() {
  lastDragDelta.x = 0
  lastDragDelta.y = 0
}

function handleWheel(event: WheelEvent) {
  if (!props.canvas) return
  
  const rect = props.canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // Check if mouse is within canvas
  if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
    event.preventDefault()
    
    const wheel = -event.deltaY / 100
    
    if (cameraMode.value === 'wasd') {
      const forwardVec = Math3D.getForwardVector(pose.yaw, pose.pitch)
      const movement = Math3D.scale(forwardVec, wheel * wasdMoveSpeed.value)
      cameraPos.x += movement.x
      cameraPos.y += movement.y
      cameraPos.z += movement.z
    } else if (cameraMode.value === 'orbit') {
      radius.value = Math.max(0.1, radius.value - wheel / 10)
    }
    
    updateCameraParams()
  }
}

function handleKeyDown(event: KeyboardEvent) {
  pressedKeys.value.add(event.key.toLowerCase())
}

function handleKeyUp(event: KeyboardEvent) {
  pressedKeys.value.delete(event.key.toLowerCase())
}

// Animation loop for continuous movement
function animationLoop() {
  // Apply momentum
  pose.yaw += momentumX.value
  pose.pitch += momentumY.value
  momentumX.value *= momentumDropoff.value
  momentumY.value *= momentumDropoff.value
  
  // Clamp pitch
  pose.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pose.pitch))
  
  // Handle WASD movement
  if (cameraMode.value === 'wasd') {
    const forwardVec = Math3D.getForwardVector(pose.yaw, pose.pitch)
    const rightVec = Math3D.normalize(Math3D.cross(forwardVec, upVector))
    const upVec = Math3D.normalize(upVector)
    
    if (pressedKeys.value.has('w') || pressedKeys.value.has('arrowup')) {
      const movement = Math3D.scale(forwardVec, wasdMoveSpeed.value)
      cameraPos.x += movement.x
      cameraPos.y += movement.y
      cameraPos.z += movement.z
    }
    if (pressedKeys.value.has('s') || pressedKeys.value.has('arrowdown')) {
      const movement = Math3D.scale(forwardVec, -wasdMoveSpeed.value)
      cameraPos.x += movement.x
      cameraPos.y += movement.y
      cameraPos.z += movement.z
    }
    if (pressedKeys.value.has('a') || pressedKeys.value.has('arrowleft')) {
      const movement = Math3D.scale(rightVec, -wasdMoveSpeed.value)
      cameraPos.x += movement.x
      cameraPos.y += movement.y
      cameraPos.z += movement.z
    }
    if (pressedKeys.value.has('d') || pressedKeys.value.has('arrowright')) {
      const movement = Math3D.scale(rightVec, wasdMoveSpeed.value)
      cameraPos.x += movement.x
      cameraPos.y += movement.y
      cameraPos.z += movement.z
    }
    if (pressedKeys.value.has('q')) {
      const movement = Math3D.scale(upVec, wasdMoveSpeed.value)
      cameraPos.x += movement.x
      cameraPos.y += movement.y
      cameraPos.z += movement.z
    }
    if (pressedKeys.value.has('e')) {
      const movement = Math3D.scale(upVec, -wasdMoveSpeed.value)
      cameraPos.x += movement.x
      cameraPos.y += movement.y
      cameraPos.z += movement.z
    }
  } else if (cameraMode.value === 'orbit') {
    // Update camera position based on orbit parameters
    const yaw = pose.yaw + Math.PI / 2
    const pitch = pose.pitch + Math.PI / 2
    
    cameraPos.x = lookatPoint.x + radius.value * Math.sin(pitch) * Math.cos(yaw)
    cameraPos.y = lookatPoint.y + radius.value * Math.cos(pitch)
    cameraPos.z = lookatPoint.z + radius.value * Math.sin(pitch) * Math.sin(yaw)
    
    // Handle orbit keyboard controls
    if (pressedKeys.value.has('w') || pressedKeys.value.has('arrowup')) {
      pose.pitch += 0.02
    }
    if (pressedKeys.value.has('s') || pressedKeys.value.has('arrowdown')) {
      pose.pitch -= 0.02
    }
    if (pressedKeys.value.has('a') || pressedKeys.value.has('arrowleft')) {
      pose.yaw += 0.02
    }
    if (pressedKeys.value.has('d') || pressedKeys.value.has('arrowright')) {
      pose.yaw -= 0.02
    }
  }
  
  updateCameraParams()
  requestAnimationFrame(animationLoop)
}

// Lifecycle
onMounted(() => {
  // Add event listeners
  document.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('wheel', handleWheel, { passive: false })
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
  
  // Start animation loop
  animationLoop()
  
  // Initial camera params
  updateCameraParams()
})

onUnmounted(() => {
  // Remove event listeners
  document.removeEventListener('mousedown', handleMouseDown)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('wheel', handleWheel)
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
})

// Watch for changes
watch([fov, radius], updateCameraParams)
</script>

<style scoped>
.camera-control {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-height: 80vh;
  overflow-y: auto;
}

.camera-control h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 2px solid #007bff;
  padding-bottom: 8px;
}

.camera-control h4 {
  margin: 16px 0 8px 0;
  color: #555;
  font-size: 14px;
  font-weight: 600;
}

.control-group {
  margin-bottom: 16px;
}

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
  font-size: 13px;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin-right: 8px;
  margin-bottom: 0;
}

select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background-color: white;
}

.slider {
  width: 100%;
  margin-bottom: 4px;
}

.number-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 8px;
}

.value-display {
  font-size: 12px;
  color: #666;
  margin-left: 8px;
}

.vector-input {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.vector-input input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
}

.button-group {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid #007bff;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  background-color: #0056b3;
  border-color: #0056b3;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}

.movement-options {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.camera-matrix-section {
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.orbit-controls {
  background-color: #f0f8ff;
  padding: 12px;
  border-radius: 4px;
  margin-top: 12px;
}

.extrinsics-matrix {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  margin-top: 12px;
}

.matrix-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.matrix-input {
  flex: 1;
  padding: 4px;
  border: 1px solid #ddd;
  border-radius: 2px;
  font-size: 11px;
  font-family: monospace;
  background-color: #f9f9f9;
}

.controls-help {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  margin-top: 16px;
  border-left: 4px solid #007bff;
}

.help-text {
  font-size: 12px;
  color: #555;
}

.help-text p {
  margin: 8px 0 4px 0;
  font-weight: 500;
}

.help-text ul {
  margin: 4px 0 12px 16px;
  padding: 0;
}

.help-text li {
  margin-bottom: 2px;
}

/* Scrollbar styling */
.camera-control::-webkit-scrollbar {
  width: 6px;
}

.camera-control::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.camera-control::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.camera-control::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>