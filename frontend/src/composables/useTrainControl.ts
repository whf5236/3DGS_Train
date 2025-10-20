import { ref, type Ref } from 'vue'
// import type { ProgramInfo, Buffers } from '@/types/webgl' 

export function useTrainControl(canvas: Ref<HTMLCanvasElement | null>) {
  const cameraId = ref<number>(0)
  const isConnected = ref<boolean>(false)
  const connectionError = ref<string | null>(null)
  
  // 训练控制状态
  const isTraining = ref<boolean>(false)
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
  }>({
    iteration: 0,
    num_gaussians: 0,
    loss: 0,
    sh_degree: 0
  })

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

  function sendTrainingControl(trainingArgs: {
    cameraId: number
    doTraining: boolean
    singleTrainingStep: boolean
    stopAtValue: number
    renderGrad: boolean
  }) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    
    // 发送训练控制参数，参考splatviz的实现
    const message = {
      camera_id: trainingArgs.cameraId,
      do_training: trainingArgs.doTraining,
      single_training_step: trainingArgs.singleTrainingStep,
      stop_at_value: trainingArgs.stopAtValue,
      render_grad: trainingArgs.renderGrad
    }
    
    socket.send(JSON.stringify(message))
  }

  function sendInteger() {
    sendTrainingControl({
      cameraId: cameraId.value,
      doTraining: true,
      singleTrainingStep: false,
      stopAtValue: -1,
      renderGrad: false
    })
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
      socket = new WebSocket('ws://localhost:8765/ws/training_control')
      socket.binaryType = 'arraybuffer'

      socket.onopen = () => {
        console.log('Connected to WebSocket server.')
        isConnected.value = true
        connectionError.value = null
        sendInteger()
      }

      socket.onmessage = (event) => {
        if (!gl || !canvas.value) return
        
        try {
          // 尝试解析JSON消息（训练统计数据）
          const message = JSON.parse(event.data)
          if (message.type === 'training_stats') {
            // 更新训练统计数据
            trainingStats.value = {
              iteration: message.iteration || 0,
              num_gaussians: message.num_gaussians || 0,
              loss: message.loss || 0,
              sh_degree: message.sh_degree || 0
            }
            currentIteration.value = message.iteration || 0
            return
          }
        } catch (e) {
          // 如果不是JSON，则处理为图像数据
        }
        
        const buffer = event.data as ArrayBuffer
        const view = new DataView(buffer)

        const width = view.getInt32(0, true)
        const height = view.getInt32(4, true)

        if (canvas.value.width !== width || canvas.value.height !== height) {
          const dpr = window.devicePixelRatio || 1
          canvas.value.width = width * dpr
          canvas.value.height = height * dpr
          gl.viewport(0, 0, width * dpr, height * dpr)
        }

        const data = new Uint8Array(buffer, 8)
        
        if (data.byteLength !== width * height * 3) {
          console.warn('Data size mismatch:', data.byteLength, 'expected:', width * height * 3)
        }

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, data)
        drawScene()
        
        // 发送当前训练控制状态
        sendTrainingControl({
          cameraId: cameraId.value,
          doTraining: isTraining.value,
          singleTrainingStep: singleStep.value,
          stopAtValue: stopAtValue.value,
          renderGrad: renderGrad.value
        })
        
        // 重置单步标志
        singleStep.value = false
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
    sendInteger()
  }

  // 训练控制方法
  function pauseTraining() {
    if (socket && isConnected.value) {
      const message = {
        type: 'control',
        action: 'pause'
      }
      socket.send(JSON.stringify(message))
      isTraining.value = false
    }
  }

  function resumeTraining() {
    if (socket && isConnected.value) {
      const message = {
        type: 'control',
        action: 'resume'
      }
      socket.send(JSON.stringify(message))
      isTraining.value = true
    }
  }

  function singleStepTraining() {
    if (socket && isConnected.value) {
      const message = {
        type: 'control',
        action: 'single_step'
      }
      socket.send(JSON.stringify(message))
      singleStep.value = true
    }
  }

  function updateStopValue(value: number) {
    stopAtValue.value = value
    if (socket && isConnected.value) {
      const message = {
        type: 'control',
        action: 'set_stop_iteration',
        value: value
      }
      socket.send(JSON.stringify(message))
    }
  }

  function toggleRenderGrad(enabled: boolean) {
    renderGrad.value = enabled
    if (socket && isConnected.value) {
      const message = {
        type: 'control',
        action: 'render_grad',
        value: enabled
      }
      socket.send(JSON.stringify(message))
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