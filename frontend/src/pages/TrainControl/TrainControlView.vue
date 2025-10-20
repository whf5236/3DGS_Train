<template>
  <div class="train-control-container">
    <div class="header">
      <h2>3D Gaussian Splatting - 训练控制</h2>
      <div class="status-indicator" :class="{ connected: isConnected, error: connectionError }">
        <span v-if="isConnected" class="status-text">● 已连接</span>
        <span v-else-if="connectionError" class="status-text">● 连接错误</span>
        <span v-else class="status-text">● 未连接</span>
      </div>
    </div>

    <div class="content">
      <canvas ref="glcanvas" class="render-canvas"></canvas>
      
      <div class="controls-panel">
        <!-- 基础控制 -->
        <div class="basic-controls">
          <h3>基础控制</h3>
          <div class="control-group">
            <label for="cameraInput">相机ID:</label>
            <input 
              type="number" 
              id="cameraInput" 
              :value="cameraId" 
              step="1" 
              min="0"
              @input="handleCameraIdChange"
              :disabled="!isConnected"
            >
          </div>
          
          <div class="control-group">
            <button 
              @click="reconnect" 
              :disabled="isConnected"
              class="btn btn-primary"
            >
              重新连接
            </button>
          </div>

          <div v-if="connectionError" class="error-message">
            {{ connectionError }}
          </div>
        </div>

        <!-- 相机控制组件 -->
        <CameraControl 
          :canvas="glcanvas"
          @camera-update="handleCameraUpdate"
        />
        
        <!-- 训练控制组件 -->
        <TrainingWidget />
        
        <!-- 渲染设置组件 -->
        <RenderWidget />
        
        <!-- 性能监控组件 -->
        <PerformanceWidget />
        
        <!-- 代码编辑器组件 -->
        <EditWidget />
        
        <!-- 评估工具组件 -->
        <EvalWidget />
        
        <!-- 保存功能组件 -->
        <SaveWidget />
        
        <!-- 视频录制组件 -->
        <VideoWidget />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, provide, watch } from 'vue'
import { useTrainControl } from '@/composables/useTrainControl'
import CameraControl from './components/CameraControl.vue'
import TrainingWidget from './components/TrainingWidget.vue'
import RenderWidget from './components/RenderWidget.vue'
import PerformanceWidget from './components/PerformanceWidget.vue'
import EditWidget from './components/EditWidget.vue'
import EvalWidget from './components/EvalWidget.vue'
import SaveWidget from './components/SaveWidget.vue'
import VideoWidget from './components/VideoWidget.vue'

// Template refs
const glcanvas = ref<HTMLCanvasElement | null>(null)

// Get WebGL context
const gl = ref<WebGLRenderingContext | null>(null)

// Shader sources
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;
    varying highp vec2 vTextureCoord;

    void main(void) {
      gl_Position = aVertexPosition;
      vTextureCoord = aTextureCoord;
    }
`;

const fsSource = `
    precision highp float;
    varying highp vec2 vTextureCoord;
    uniform sampler2D uSampler;

    void main(void) {
      gl_FragColor = texture2D(uSampler, vTextureCoord);
    }
`;

// Function to init shader program
function initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
    function loadShader(gl: WebGLRenderingContext, type: number, source: string) {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) return null;

    const shaderProgram = gl.createProgram();
    if (!shaderProgram) return null;
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

// Program info
const programInfo = ref<any>(null)

// Buffers
const buffers = ref<any>(null)

// Texture
const texture = ref<WebGLTexture | null>(null)

// WebSocket
const socket = ref<WebSocket | null>(null)

// Use composable
const trainControl = useTrainControl(glcanvas)
const {
  cameraId,
  isConnected,
  connectionError,
  connect,
  disconnect,
  updateCameraId
} = trainControl

// 提供训练控制给子组件
provide('trainControl', trainControl)

// Camera parameters
interface CameraParams {
  fov: number
  pose: { yaw: number; pitch: number }
  cameraMatrix: number[][]
  lookatPoint: { x: number; y: number; z: number }
  upVector: { x: number; y: number; z: number }
  cameraMode: string
}

// Handle camera parameter updates
function handleCameraUpdate(params: CameraParams) {
  console.log('Camera parameters updated:', params)
  // Here you can integrate the camera parameters with your WebGL rendering
  // For example, update the view matrix, projection matrix, etc.
  
  // You might want to send these parameters to your backend or use them
  // to update the 3D rendering in your canvas
}

// Handle camera ID input change
function handleCameraIdChange(event: Event) {
  const target = event.target as HTMLInputElement
  const newId = parseInt(target.value, 10)
  if (!isNaN(newId) && newId >= 0) {
    updateCameraId(newId)
  }
}

// Reconnect function
function reconnect() {
  disconnect()
  setTimeout(() => {
    connect()
  }, 1000)
}

// Function to init buffers
function initBuffers(gl: WebGLRenderingContext) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = [
        -1.0,  1.0,
         1.0,  1.0,
        -1.0, -1.0,
         1.0, -1.0,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

    const textureCoordinates = [
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 1.0,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        textureCoord: textureCoordBuffer,
    };
}

// Draw scene function
function drawScene(gl: WebGLRenderingContext, programInfo: any, buffers: any, texture: WebGLTexture) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
        gl.vertexAttribPointer(
            programInfo.attribLocations.textureCoord,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.useProgram(programInfo.program);
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// Function to send integer
function sendInteger() {
    if (!socket.value || socket.value.readyState !== WebSocket.OPEN) return;
    
    const intToSend = cameraId.value;
    const arrayBuffer = new ArrayBuffer(4);
    const view = new DataView(arrayBuffer);
    view.setInt32(0, intToSend, false); // big-endian
    socket.value.send(arrayBuffer);
}

// Watch for cameraId changes
watch(cameraId, () => {
    sendInteger();
});

// Init WebGL
function initWebGL() {
    if (!glcanvas.value) return false;
    
    gl.value = glcanvas.value.getContext('webgl');
    if (!gl.value) {
        console.error('Unable to initialize WebGL');
        return false;
    }

    const shaderProgram = initShaderProgram(gl.value, vsSource, fsSource);
    if (!shaderProgram) return false;

    programInfo.value = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.value.getAttribLocation(shaderProgram, 'aVertexPosition'),
            textureCoord: gl.value.getAttribLocation(shaderProgram, 'aTextureCoord'),
        },
        uniformLocations: {
            uSampler: gl.value.getUniformLocation(shaderProgram, 'uSampler'),
        },
    };

    buffers.value = initBuffers(gl.value);

    texture.value = gl.value.createTexture();
    const glCtx = gl.value; // Temporary variable to help TS
    glCtx.bindTexture(glCtx.TEXTURE_2D, texture.value);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_S, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_T, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MIN_FILTER, glCtx.LINEAR);

    glCtx.pixelStorei(glCtx.UNPACK_ALIGNMENT, 1);

    return true;
}

// Init WebSocket
function initWebSocket() {
    socket.value = new WebSocket('ws://localhost:8009');
    socket.value.binaryType = 'arraybuffer';

    socket.value.onopen = () => {
        console.log('Connected to WebSocket server.');
        sendInteger();
    };

    socket.value.onmessage = (event) => {
        if (!gl.value || !texture.value || !programInfo.value || !buffers.value || !glcanvas.value) return;

        const buffer = event.data;
        const view = new DataView(buffer);
        const width = view.getInt32(0, true);
        const height = view.getInt32(4, true);

        const glCtx = gl.value;
        if (glcanvas.value.width !== width || glcanvas.value.height !== height) {
            const dpr = window.devicePixelRatio || 1;
            glcanvas.value.width = width * dpr;
            glcanvas.value.height = height * dpr;
            glCtx.viewport(0, 0, width * dpr, height * dpr);
        }

        const data = new Uint8Array(buffer, 8);

        if (data.byteLength !== width * height * 3) {
            console.warn('Data length mismatch');
            return;
        }

        glCtx.bindTexture(glCtx.TEXTURE_2D, texture.value);
        glCtx.texImage2D(glCtx.TEXTURE_2D, 0, glCtx.RGB, width, height, 0, glCtx.RGB, glCtx.UNSIGNED_BYTE, data);

        drawScene(glCtx, programInfo.value, buffers.value, texture.value);

        sendInteger();
    };

    socket.value.onerror = (error) => {
        console.error('WebSocket Error:', error);
        connectionError.value = 'WebSocket connection error';
    };

    socket.value.onclose = () => {
        console.log('WebSocket is closed.');
        isConnected.value = false;
    };
}

// Lifecycle hooks
onMounted(() => {
    if (initWebGL()) {
        console.log('WebGL initialized successfully');
        initWebSocket();
    } else {
        console.error('Failed to initialize WebGL');
    }

    // 连接训练控制
    connect()
})

onUnmounted(() => {
    if (socket.value) {
        socket.value.close();
    }
    disconnect()
})
</script>

<style scoped>
.train-control-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%);
  position: relative;
}

.train-control-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3), transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(120, 40, 200, 0.3), transparent 50%);
  pointer-events: none;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 1;
}

.header h2 {
  margin: 0;
  color: #fff;
  font-size: 24px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.status-indicator {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.status-indicator.connected {
  background: rgba(28, 200, 138, 0.3);
  border-color: rgba(28, 200, 138, 0.5);
  color: #1cc88a;
  box-shadow: 0 0 15px rgba(28, 200, 138, 0.3);
}

.status-indicator.error {
  background: rgba(231, 74, 59, 0.3);
  border-color: rgba(231, 74, 59, 0.5);
  color: #e74a3b;
  box-shadow: 0 0 15px rgba(231, 74, 59, 0.3);
}

.status-indicator:not(.connected):not(.error) {
  color: rgba(255, 255, 255, 0.7);
}

.status-text {
  font-size: 14px;
  font-weight: 500;
}

.content {
  display: flex;
  flex: 1;
  gap: 20px;
  position: relative;
  z-index: 1;
}

.render-canvas {
  flex: 1;
  max-width: 70%;
  height: 600px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  background-color: #000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.controls-panel {
  width: 400px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  height: fit-content;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.widget-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.widget-section:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

/* 滚动条样式 */
.controls-panel::-webkit-scrollbar {
  width: 8px;
}

.controls-panel::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.controls-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.controls-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.basic-controls {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border-radius: 12px;
  padding: 20px;
  margin: 16px 16px 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.basic-controls h3 {
  margin: 0 0 16px 0;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 10px;
}

.controls-panel > :last-child {
  margin: 0 16px 16px 16px;
}

.control-group {
  margin-bottom: 15px;
}

.control-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #f0f0f0;
  font-size: 14px;
}

.control-group input {
  width: 100%;
  padding: 10px 12px;
  background-color: rgba(0, 0, 0, 0.3);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.control-group input:focus {
  outline: none;
  background-color: rgba(0, 0, 0, 0.4);
  border-color: #4e73df;
  box-shadow: 0 0 0 2px rgba(78, 115, 223, 0.25);
}

.control-group input:disabled {
  background-color: rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
  opacity: 0.6;
}

.btn {
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  letter-spacing: 0.5px;
}

.btn-primary {
  background: linear-gradient(135deg, rgba(78, 115, 223, 0.8), rgba(78, 115, 223, 0.6));
  border: 2px solid rgba(78, 115, 223, 0.4);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(78, 115, 223, 1), rgba(78, 115, 223, 0.8));
  transform: translateY(-2px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
}

.btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  cursor: not-allowed;
  opacity: 0.5;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.error-message {
  padding: 12px;
  background-color: rgba(231, 74, 59, 0.2);
  color: #ff9999;
  border: 1px solid rgba(231, 74, 59, 0.4);
  border-radius: 8px;
  font-size: 14px;
  margin-top: 10px;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

@media (max-width: 1200px) {
  .controls-panel {
    width: 350px;
  }
}

@media (max-width: 768px) {
  .content {
    flex-direction: column;
  }
  
  .render-canvas {
    max-width: 100%;
    height: 400px;
  }
  
  .controls-panel {
    width: 100%;
    max-height: 60vh;
    height: 300px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .basic-controls {
    margin: 8px 8px 0 8px;
    padding: 16px;
  }
  
  .controls-panel > :last-child {
    margin: 0 8px 8px 8px;
  }
  
  .header {
    padding: 15px;
  }
  
  .header h2 {
    font-size: 20px;
  }
}
</style>