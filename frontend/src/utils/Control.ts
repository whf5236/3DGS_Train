 export interface Pose {
  yaw: number
  pitch: number
  row: number
}
export interface CameraParams {
  fov: number
  pose: Pose
  cameraMatrix: number[][]
  lookatPoint: Vector3
  upVector: Vector3
  cameraMode: string
}
export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface Matrix4 {
  elements: number[] // 16个元素，按列主序存储
}

export interface ProgramInfo {
  program: WebGLProgram
  attribLocations: {
    vertexPosition: number
    textureCoord: number
  }
  uniformLocations: {
    uSampler: WebGLUniformLocation | null
  }
}

export interface Buffers {
  position: WebGLBuffer | null
  textureCoord: WebGLBuffer | null
}