/**
 * WebGL 相关类型定义
 */

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