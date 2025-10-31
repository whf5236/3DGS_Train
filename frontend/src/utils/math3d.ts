import type { Matrix4, Vector3 } from "./Control"


export class Math3D {
  // 创建单位矩阵
  static identity(): Matrix4 {
    return {
      elements: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ]
    }
  }

  // 向量归一化
  static normalize(v: Vector3): Vector3 {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
    if (length === 0) return { x: 0, y: 0, z: 0 }
    return {
      x: v.x / length,
      y: v.y / length,
      z: v.z / length
    }
  }

  // 向量叉积
  static cross(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    }
  }

  // 向量点积
  static dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z
  }

  // 向量减法
  static subtract(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.x - b.x,
      y: a.y - b.y,
      z: a.z - b.z
    }
  }

  // 向量加法
  static add(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.x + b.x,
      y: a.y + b.y,
      z: a.z + b.z
    }
  }

  // 向量标量乘法
  static scale(v: Vector3, s: number): Vector3 {
    return {
      x: v.x * s,
      y: v.y * s,
      z: v.z * s
    }
  }

  // 根据偏航角和俯仰角计算前向向量
  static getForwardVector(yaw: number, pitch: number): Vector3 {
    return {
      x: Math.cos(pitch) * Math.sin(yaw),
      y: Math.sin(pitch),
      z: Math.cos(pitch) * Math.cos(yaw)
    }
  }

  // 根据轨道参数计算相机位置
  static getOrbitPosition(
    yaw: number, 
    pitch: number, 
    radius: number, 
    center: Vector3
  ): Vector3 {
    const x = center.x + radius * Math.sin(pitch) * Math.cos(yaw)
    const y = center.y + radius * Math.cos(pitch)
    const z = center.z + radius * Math.sin(pitch) * Math.sin(yaw)
    
    return { x, y, z }
  }

  // 创建观察矩阵 (lookAt)
  static lookAt(eye: Vector3, target: Vector3, up: Vector3): Matrix4 {
    const f = this.normalize(this.subtract(target, eye))
    const s = this.normalize(this.cross(f, up))
    const u = this.cross(s, f)

    const result = this.identity()
    result.elements[0] = s.x
    result.elements[4] = s.y
    result.elements[8] = s.z
    result.elements[12] = -this.dot(s, eye)

    result.elements[1] = u.x
    result.elements[5] = u.y
    result.elements[9] = u.z
    result.elements[13] = -this.dot(u, eye)

    result.elements[2] = -f.x
    result.elements[6] = -f.y
    result.elements[10] = -f.z
    result.elements[14] = this.dot(f, eye)

    result.elements[3] = 0
    result.elements[7] = 0
    result.elements[11] = 0
    result.elements[15] = 1

    return result
  }

  // 创建透视投影矩阵
  static perspective(fov: number, aspect: number, near: number, far: number): Matrix4 {
    const f = 1.0 / Math.tan(fov / 2)
    const nf = 1 / (near - far)

    const result = this.identity()
    result.elements[0] = f / aspect
    result.elements[5] = f
    result.elements[10] = (far + near) * nf
    result.elements[11] = -1
    result.elements[14] = 2 * far * near * nf
    result.elements[15] = 0

    return result
  }

  // 矩阵乘法
  static multiply(a: Matrix4, b: Matrix4): Matrix4 {
    const result = this.identity()
    const ae = a.elements
    const be = b.elements
    const te = result.elements

    const a11 = ae[0] ?? 0, a12 = ae[4] ?? 0, a13 = ae[8] ?? 0, a14 = ae[12] ?? 0
    const a21 = ae[1] ?? 0, a22 = ae[5] ?? 0, a23 = ae[9] ?? 0, a24 = ae[13] ?? 0
    const a31 = ae[2] ?? 0, a32 = ae[6] ?? 0, a33 = ae[10] ?? 0, a34 = ae[14] ?? 0
    const a41 = ae[3] ?? 0, a42 = ae[7] ?? 0, a43 = ae[11] ?? 0, a44 = ae[15] ?? 0

    const b11 = be[0] ?? 0, b12 = be[4] ?? 0, b13 = be[8] ?? 0, b14 = be[12] ?? 0
    const b21 = be[1] ?? 0, b22 = be[5] ?? 0, b23 = be[9] ?? 0, b24 = be[13] ?? 0
    const b31 = be[2] ?? 0, b32 = be[6] ?? 0, b33 = be[10] ?? 0, b34 = be[14] ?? 0
    const b41 = be[3] ?? 0, b42 = be[7] ?? 0, b43 = be[11] ?? 0, b44 = be[15] ?? 0

    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44

    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44

    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44

    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44

    return result
  }

  // 将矩阵转换为4x4数组格式
  static toArray4x4(matrix: Matrix4): number[][] {
    const e = matrix.elements
    return [
      [e[0] ?? 0, e[4] ?? 0, e[8] ?? 0, e[12] ?? 0],
      [e[1] ?? 0, e[5] ?? 0, e[9] ?? 0, e[13] ?? 0],
      [e[2] ?? 0, e[6] ?? 0, e[10] ?? 0, e[14] ?? 0],
      [e[3] ?? 0, e[7] ?? 0, e[11] ?? 0, e[15] ?? 0]
    ]
  }

  // 角度转弧度
  static degToRad(degrees: number): number {
    return degrees * Math.PI / 180
  }

  // 弧度转角度
  static radToDeg(radians: number): number {
    return radians * 180 / Math.PI
  }

  // 限制值在指定范围内
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  // 线性插值
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  // 向量线性插值
  static lerpVector3(a: Vector3, b: Vector3, t: number): Vector3 {
    return {
      x: this.lerp(a.x, b.x, t),
      y: this.lerp(a.y, b.y, t),
      z: this.lerp(a.z, b.z, t)
    }
  }
}