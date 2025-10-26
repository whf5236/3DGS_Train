import { ref, watch, type Ref } from 'vue'
import { Math3D, type Matrix4 } from '@/utils/math3d'

interface CameraParams {
  fov: number
  pose: { yaw: number; pitch: number }
  cameraMatrix: number[][]
  lookatPoint: { x: number; y: number; z: number }
  upVector: { x: number; y: number; z: number }
  cameraMode: string
}

export function useCameraRenderer(canvas: Ref<HTMLCanvasElement | null>) {
  const gl = ref<WebGLRenderingContext | null>(null)
  const viewMatrix = ref<Matrix4>(Math3D.identity())
  const projectionMatrix = ref<Matrix4>(Math3D.identity())

  // 初始化WebGL上下文
  function initGL() {
    if (!canvas.value) return false
    
    const context = canvas.value.getContext('webgl')
    if (!context) {
      console.error('WebGL not supported')
      return false
    }
    
    gl.value = context
    
    // 设置视口
    gl.value.viewport(0, 0, canvas.value.width, canvas.value.height)
    
    // 启用深度测试
    gl.value.enable(gl.value.DEPTH_TEST)
    
    return true
  }

  // 更新投影矩阵
  function updateProjectionMatrix(fov: number, aspect: number, near = 0.1, far = 1000) {
    const fovRad = Math3D.degToRad(fov)
    projectionMatrix.value = Math3D.perspective(fovRad, aspect, near, far)
  }

  // 更新视图矩阵
  function updateViewMatrix(cameraMatrix: number[][]) {
    // 将4x4数组转换为Matrix4格式
    const elements: number[] = [
      cameraMatrix[0]?.[0] ?? 0, cameraMatrix[1]?.[0] ?? 0, cameraMatrix[2]?.[0] ?? 0, cameraMatrix[3]?.[0] ?? 0,
      cameraMatrix[0]?.[1] ?? 0, cameraMatrix[1]?.[1] ?? 0, cameraMatrix[2]?.[1] ?? 0, cameraMatrix[3]?.[1] ?? 0,
      cameraMatrix[0]?.[2] ?? 0, cameraMatrix[1]?.[2] ?? 0, cameraMatrix[2]?.[2] ?? 0, cameraMatrix[3]?.[2] ?? 0,
      cameraMatrix[0]?.[3] ?? 0, cameraMatrix[1]?.[3] ?? 0, cameraMatrix[2]?.[3] ?? 0, cameraMatrix[3]?.[3] ?? 0
    ]
    
    viewMatrix.value = { elements }
  }

  // 处理相机参数更新
  function handleCameraUpdate(params: CameraParams) {
    if (!canvas.value) return
    
    // 更新投影矩阵
    const aspect = canvas.value.width / canvas.value.height
    updateProjectionMatrix(params.fov, aspect)
    
    // 更新视图矩阵
    updateViewMatrix(params.cameraMatrix)
    
    // 触发重新渲染
    render()
  }

  // 基础渲染函数
  function render() {
    if (!gl.value || !canvas.value) return
    
    // 清除颜色和深度缓冲
    gl.value.clearColor(0.1, 0.1, 0.1, 1.0)
    gl.value.clear(gl.value.COLOR_BUFFER_BIT | gl.value.DEPTH_BUFFER_BIT)
    
    // 这里可以添加实际的3D对象渲染逻辑
    // 使用 viewMatrix.value 和 projectionMatrix.value
    
    console.log('Rendering with camera matrices:', {
      view: viewMatrix.value,
      projection: projectionMatrix.value
    })
  }

  // 获取MVP矩阵（模型-视图-投影）
  function getMVPMatrix(modelMatrix?: Matrix4): Matrix4 {
    const model = modelMatrix || Math3D.identity()
    const mv = Math3D.multiply(viewMatrix.value, model)
    return Math3D.multiply(projectionMatrix.value, mv)
  }

  // 获取相机位置（从视图矩阵中提取）
  function getCameraPosition(): { x: number; y: number; z: number } {
    const vm = viewMatrix.value.elements
    return {
      x: -((vm[0] ?? 0) * (vm[12] ?? 0) + (vm[1] ?? 0) * (vm[13] ?? 0) + (vm[2] ?? 0) * (vm[14] ?? 0)),
      y: -((vm[4] ?? 0) * (vm[12] ?? 0) + (vm[5] ?? 0) * (vm[13] ?? 0) + (vm[6] ?? 0) * (vm[14] ?? 0)),
      z: -((vm[8] ?? 0) * (vm[12] ?? 0) + (vm[9] ?? 0) * (vm[13] ?? 0) + (vm[10] ?? 0) * (vm[14] ?? 0))
    }
  }

  // 监听canvas尺寸变化
  watch(canvas, (newCanvas) => {
    if (newCanvas) {
      const resizeObserver = new ResizeObserver(() => {
        if (newCanvas) {
          const rect = newCanvas.getBoundingClientRect()
          newCanvas.width = rect.width
          newCanvas.height = rect.height
          
          if (gl.value) {
            gl.value.viewport(0, 0, newCanvas.width, newCanvas.height)
            // 重新计算投影矩阵
            const aspect = newCanvas.width / newCanvas.height
            updateProjectionMatrix(60, aspect) // 使用默认FOV
            render()
          }
        }
      })
      
      resizeObserver.observe(newCanvas)
      
      return () => {
        resizeObserver.disconnect()
      }
    }
  })

  return {
    initGL,
    handleCameraUpdate,
    render,
    getMVPMatrix,
    getCameraPosition,
    viewMatrix: viewMatrix.value,
    projectionMatrix: projectionMatrix.value
  }
}