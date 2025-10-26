import { ref, type Ref } from 'vue'
import type { ProgramInfo, Buffers } from '@/types/webgl'

export function useTrainControl(canvas: Ref<HTMLCanvasElement | null>) {
  const cameraId = ref<number>(0)
  const isConnected = ref<boolean>(false)
  const connectionError = ref<string | null>(null)
  
  // 训练控制状态
  const isTraining = ref<boolean>(true)
  const currentIteration = ref<number>(0)
  const stopAtValue = ref<number>(-1)
  const renderGrad = ref<boolean>(false)
  const singleStep = ref<boolean>(false)
  
  // 训练统计数据
  const trainingStats = ref<{
    iteration: number
    num_gaussians: number
    loss: number
    sh_degree: number
    paused: boolean
    train_params: Record<string, any>
  }>({
    iteration: 0,
    num_gaussians: 0,
    loss: 0,
    sh_degree: 0,
    paused: false,
    train_params: {}
  })

  // Camera parameters
  const cameraFov = ref<number>(45.0)  // degrees
  const cameraYaw = ref<number>(0)
  const cameraPitch = ref<number>(0)
  const cameraDistance = ref<number>(5.0)
  const resolution = ref<number>(800)

  let gl: WebGLRenderingContext | null = null
  let socket: WebSocket | null = null
  let shaderProgram: WebGLProgram | null = null
  let programInfo: ProgramInfo | null = null
  let buffers: Buffers | null = null
  let texture: WebGLTexture | null = null

  const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;
    varying highp vec2 vTextureCoord;

    void main(void) {
      gl_Position = aVertexPosition;
      vTextureCoord = aTextureCoord;
    }
  `

  const fsSource = `
    precision highp float;
    varying highp vec2 vTextureCoord;
    uniform sampler2D uSampler;

    void main(void) {
      gl_FragColor = texture2D(uSampler, vTextureCoord);
    }
  `

  function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null
    
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }

    return shader
  }

  function initShaderProgram(gl: WebGLRenderingContext): WebGLProgram | null {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource)
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource)
    
    if (!vertexShader || !fragmentShader) return null

    const program = gl.createProgram()
    if (!program) return null
    
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program))
      return null
    }

    return program
  }

  function initBuffers(gl: WebGLRenderingContext): Buffers {
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    const positions = [
      -1.0,  1.0,
       1.0,  1.0,
      -1.0, -1.0,
       1.0, -1.0,
    ]

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

    const textureCoordBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer)

    const textureCoordinates = [
      0.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      1.0, 1.0,
    ]

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW)

    return {
      position: positionBuffer,
      textureCoord: textureCoordBuffer,
    }
  }

  function drawScene() {
    if (!gl || !programInfo || !buffers || !texture) return

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    // Position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position)
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition)

    // Texture coordinate attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord)
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord)

    // Use texture and draw
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.useProgram(programInfo.program)
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  function getCameraMatrices() {
    // Convert yaw/pitch to camera position
    const yawRad = (cameraYaw.value * Math.PI) / 180
    const pitchRad = (cameraPitch.value * Math.PI) / 180
    
    // Calculate camera position in spherical coordinates
    const x = cameraDistance.value * Math.cos(pitchRad) * Math.sin(yawRad)
    const y = cameraDistance.value * Math.sin(pitchRad)
    const z = cameraDistance.value * Math.cos(pitchRad) * Math.cos(yawRad)
    
    // Look at origin
    const eye = [x, y, z]
    const target = [0, 0, 0]
    const up = [0, 1, 0]
    
    // Build view matrix
    const viewMatrix = lookAt(eye, target, up)
    
    // Build projection matrix
    const fovRad = (cameraFov.value * Math.PI) / 180
    const aspect = 1.0  // Square resolution
    const near = 0.01
    const far = 100.0
    
    const projMatrix = perspective(fovRad, aspect, near, far)
    
    // Compute view-projection matrix
    const viewProjMatrix = multiplyMatrices(projMatrix, viewMatrix)
    
    return {
      viewMatrix: viewMatrix,
      viewProjMatrix: viewProjMatrix,
      fovRad: fovRad
    }
  }

  function lookAt(eye: number[], target: number[], up: number[]): number[] {
    const zAxis = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]])
    const xAxis = normalize(cross(up, zAxis))
    const yAxis = cross(zAxis, xAxis)
    
    return [
      xAxis[0], yAxis[0], zAxis[0], 0,
      xAxis[1], yAxis[1], zAxis[1], 0,
      xAxis[2], yAxis[2], zAxis[2], 0,
      -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1
    ]
  }

  function perspective(fovy: number, aspect: number, near: number, far: number): number[] {
    const f = 1.0 / Math.tan(fovy / 2)
    const nf = 1 / (near - far)
    
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]
  }

  function multiplyMatrices(a: number[], b: number[]): number[] {
    const result = new Array(16).fill(0)
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          result[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j]
        }
      }
    }
    return result
  }

  function normalize(v: number[]): number[] {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
    return [v[0] / len, v[1] / len, v[2] / len]
  }

  function cross(a: number[], b: number[]): number[] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ]
  }

  function dot(a: number[], b: number[]): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  }

  function sendTrainingControl() {
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    
    const { viewMatrix, viewProjMatrix, fovRad } = getCameraMatrices()
    
    const message = {
      resolution_x: resolution.value,
      resolution_y: resolution.value,
      train: isTraining.value,
      fov_y: fovRad,
      fov_x: fovRad,
      z_near: 0.01,
      z_far: 100.0,
      shs_python: false,
      rot_scale_python: false,
      keep_alive: true,
      scaling_modifier: 1.0,
      view_matrix: viewMatrix,
      view_projection_matrix: viewProjMatrix,
      single_training_step: singleStep.value,
      stop_at_value: stopAtValue.value,
      render_grad: renderGrad.value
    }
    
    socket.send(JSON.stringify(message))
  }

  function initWebGL(): boolean {
    if (!canvas.value) return false
    
    gl = canvas.value.getContext('webgl')
    if (!gl) {
      connectionError.value = 'Unable to initialize WebGL. Your browser may not support it.'
      return false
    }

    shaderProgram = initShaderProgram(gl)
    if (!shaderProgram) return false

    programInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
      },
      uniformLocations: {
        uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
      },
    }

    buffers = initBuffers(gl)

    texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

    return true
  }

  function initWebSocket() {
    try {
      // Connect to port 6009 (network_gui)
      socket = new WebSocket('ws://localhost:6009')
      socket.binaryType = 'arraybuffer'

      socket.onopen = () => {
        console.log('Connected to training server on port 6009')
        isConnected.value = true
        connectionError.value = null
        sendTrainingControl()
      }

      socket.onmessage = (event) => {
        if (!gl || !canvas.value) return
        
        const buffer = event.data as ArrayBuffer
        
        // First, try to parse as image data (width + height + RGB)
        if (buffer.byteLength >= 8) {
          const view = new DataView(buffer)
          const width = view.getInt32(0, true)
          const height = view.getInt32(4, true)
          
          // Check if this looks like image data
          const expectedImageSize = width * height * 3 + 8
          if (buffer.byteLength >= expectedImageSize) {
            // This is image data
            if (canvas.value.width !== width || canvas.value.height !== height) {
              const dpr = window.devicePixelRatio || 1
              canvas.value.width = width * dpr
              canvas.value.height = height * dpr
              gl.viewport(0, 0, width * dpr, height * dpr)
            }

            const imageData = new Uint8Array(buffer, 8, width * height * 3)
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, imageData)
            drawScene()
            
            // Send next frame request
            sendTrainingControl()
            return
          }
          
          // Check if this is stats data (4 byte length + JSON)
          if (buffer.byteLength >= 4) {
            const jsonLength = view.getInt32(0, true)
            if (buffer.byteLength >= 4 + jsonLength) {
              try {
                const jsonData = new Uint8Array(buffer, 4, jsonLength)
                const jsonString = new TextDecoder().decode(jsonData)
                const stats = JSON.parse(jsonString)
                
                // Update training statistics
                trainingStats.value = {
                  iteration: stats.iteration || 0,
                  num_gaussians: stats.num_gaussians || 0,
                  loss: stats.loss || 0,
                  sh_degree: stats.sh_degree || 0,
                  paused: stats.paused || false,
                  train_params: stats.train_params || {}
                }
                currentIteration.value = stats.iteration || 0
              } catch (e) {
                console.warn('Failed to parse stats JSON:', e)
              }
            }
          }
        }
      }

      socket.onerror = (error) => {
        console.error('WebSocket Error:', error)
        connectionError.value = 'WebSocket connection error'
        isConnected.value = false
      }

      socket.onclose = () => {
        console.log('WebSocket is closed now.')
        isConnected.value = false
      }
    } catch (error) {
      connectionError.value = 'Failed to create WebSocket connection'
      console.error('WebSocket creation error:', error)
    }
  }

  function connect() {
    if (initWebGL()) {
      initWebSocket()
    }
  }

  function disconnect() {
    if (socket) {
      socket.close()
      socket = null
    }
    isConnected.value = false
  }

  function updateCameraId(newId: number) {
    cameraId.value = newId
  }

  function updateCameraParams(params: { fov?: number; yaw?: number; pitch?: number; distance?: number }) {
    if (params.fov !== undefined) cameraFov.value = params.fov
    if (params.yaw !== undefined) cameraYaw.value = params.yaw
    if (params.pitch !== undefined) cameraPitch.value = params.pitch
    if (params.distance !== undefined) cameraDistance.value = params.distance
    
    if (socket && isConnected.value) {
      sendTrainingControl()
    }
  }

  // 训练控制方法
  function pauseTraining() {
    isTraining.value = false
    if (socket && isConnected.value) {
      sendTrainingControl()
    }
  }

  function resumeTraining() {
    isTraining.value = true
    if (socket && isConnected.value) {
      sendTrainingControl()
    }
  }

  function singleStepTraining() {
    singleStep.value = true
    if (socket && isConnected.value) {
      sendTrainingControl()
    }
  }

  function updateStopValue(value: number) {
    stopAtValue.value = value
    if (socket && isConnected.value) {
      sendTrainingControl()
    }
  }

  function toggleRenderGrad(enabled: boolean) {
    renderGrad.value = enabled
    if (socket && isConnected.value) {
      sendTrainingControl()
    }
  }

  return {
    // 基础连接
    cameraId,
    isConnected,
    connectionError,
    connect,
    disconnect,
    updateCameraId,
    
    // 相机参数
    cameraFov,
    cameraYaw,
    cameraPitch,
    cameraDistance,
    updateCameraParams,
    
    // 训练状态
    isTraining,
    currentIteration,
    stopAtValue,
    renderGrad,
    singleStep,
    trainingStats,
    
    // 训练控制方法
    pauseTraining,
    resumeTraining,
    singleStepTraining,
    updateStopValue,
    toggleRenderGrad
  }
}
