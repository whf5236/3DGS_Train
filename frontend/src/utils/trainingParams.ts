export interface TrainingParameters {
  iterations: number
  resolution: number
  white_background: boolean
  sh_degree: number
  data_device: string
  eval: boolean
  position_lr_init: number
  position_lr_final: number
  position_lr_delay_mult: number
  position_lr_max_steps: number
  feature_lr: number
  opacity_lr: number
  scaling_lr: number
  rotation_lr: number
  percent_dense: number
  lambda_dssim: number
  densification_interval: number
  opacity_reset_interval: number
  densify_from_iter: number
  densify_until_iter: number
  densify_grad_threshold: number
  random_background: boolean
  test_iterations: number[]
  save_iterations: number[]
  checkpoint_iterations: number[]
}

export class TrainingParams {
  /**
   * 获取默认训练参数
   */
  static getDefaultParams(): TrainingParameters {
    return {
      iterations: 30000,
      resolution: -1,
      white_background: false,
      sh_degree: 3,
      data_device: 'cuda',
      eval: true,
      position_lr_init: 0.00016,
      position_lr_final: 0.0000016,
      position_lr_delay_mult: 0.01,
      position_lr_max_steps: 30000,
      feature_lr: 0.0025,
      opacity_lr: 0.05,
      scaling_lr: 0.005,
      rotation_lr: 0.001,
      percent_dense: 0.01,
      lambda_dssim: 0.2,
      densification_interval: 100,
      opacity_reset_interval: 3000,
      densify_from_iter: 500,
      densify_until_iter: 15000,
      densify_grad_threshold: 0.0002,
      random_background: false,
      test_iterations: [7000, 30000],
      save_iterations: [7000, 30000],
      checkpoint_iterations: []
    }
  }

  /**
   * 解析迭代次数字符串
   */
  static parseIterations(iterationsStr: string): number[] {
    if (!iterationsStr || !iterationsStr.trim()) {
      return []
    }

    return iterationsStr
      .split(/\s+/)
      .map(s => s.trim())
      .filter(s => s)
      .map(s => parseInt(s))
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b)
  }

  /**
   * 解析迭代次数字符串（兼容旧版本）
   */
  static parseIterationString(iterationsStr: string): number[] {
    return this.parseIterations(iterationsStr)
  }

  /**
   * 验证训练参数
   */
  static validateParams(params: TrainingParameters): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (params.iterations <= 0) {
      errors.push('迭代次数必须大于0')
    }

    if (params.resolution < -1) {
      errors.push('分辨率必须大于等于-1')
    }

    if (params.sh_degree < 0 || params.sh_degree > 4) {
      errors.push('球谐度数必须在0-4之间')
    }

    if (params.position_lr_init <= 0) {
      errors.push('位置学习率初始值必须大于0')
    }

    if (params.position_lr_final <= 0) {
      errors.push('位置学习率最终值必须大于0')
    }

    if (params.feature_lr <= 0) {
      errors.push('特征学习率必须大于0')
    }

    if (params.opacity_lr <= 0) {
      errors.push('透明度学习率必须大于0')
    }

    if (params.scaling_lr <= 0) {
      errors.push('缩放学习率必须大于0')
    }

    if (params.rotation_lr <= 0) {
      errors.push('旋转学习率必须大于0')
    }

    if (params.percent_dense < 0 || params.percent_dense > 1) {
      errors.push('密度百分比必须在0-1之间')
    }

    if (params.lambda_dssim < 0 || params.lambda_dssim > 1) {
      errors.push('DSSIM权重必须在0-1之间')
    }

    if (params.densification_interval <= 0) {
      errors.push('密化间隔必须大于0')
    }

    if (params.opacity_reset_interval <= 0) {
      errors.push('透明度重置间隔必须大于0')
    }

    if (params.densify_from_iter < 0) {
      errors.push('密化开始迭代必须大于等于0')
    }

    if (params.densify_until_iter <= params.densify_from_iter) {
      errors.push('密化结束迭代必须大于密化开始迭代')
    }

    if (params.densify_grad_threshold <= 0) {
      errors.push('密化梯度阈值必须大于0')
    }

    // 验证迭代数组
    if (params.test_iterations.some(iter => iter <= 0)) {
      errors.push('测试迭代次数必须大于0')
    }

    if (params.save_iterations.some(iter => iter <= 0)) {
      errors.push('保存迭代次数必须大于0')
    }

    if (params.checkpoint_iterations.some(iter => iter <= 0)) {
      errors.push('检查点迭代次数必须大于0')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 格式化参数用于API调用
   */
  static formatParamsForAPI(params: TrainingParameters): Record<string, any> {
    return {
      iterations: params.iterations,
      resolution: params.resolution,
      white_background: params.white_background,
      sh_degree: params.sh_degree,
      data_device: params.data_device,
      eval: params.eval,
      position_lr_init: params.position_lr_init,
      position_lr_final: params.position_lr_final,
      position_lr_delay_mult: params.position_lr_delay_mult,
      position_lr_max_steps: params.position_lr_max_steps,
      feature_lr: params.feature_lr,
      opacity_lr: params.opacity_lr,
      scaling_lr: params.scaling_lr,
      rotation_lr: params.rotation_lr,
      percent_dense: params.percent_dense,
      lambda_dssim: params.lambda_dssim,
      densification_interval: params.densification_interval,
      opacity_reset_interval: params.opacity_reset_interval,
      densify_from_iter: params.densify_from_iter,
      densify_until_iter: params.densify_until_iter,
      densify_grad_threshold: params.densify_grad_threshold,
      random_background: params.random_background,
      test_iterations: params.test_iterations,
      save_iterations: params.save_iterations,
      checkpoint_iterations: params.checkpoint_iterations
    }
  }

  /**
   * 从对象创建训练参数
   */
  static fromObject(obj: Partial<TrainingParameters>): TrainingParameters {
    const defaultParams = this.getDefaultParams()
    return {
      ...defaultParams,
      ...obj
    }
  }

  /**
   * 克隆训练参数
   */
  static clone(params: TrainingParameters): TrainingParameters {
    return { 
      ...params,
      test_iterations: [...params.test_iterations],
      save_iterations: [...params.save_iterations],
      checkpoint_iterations: [...params.checkpoint_iterations]
    }
  }

  /**
   * 格式化迭代数组为字符串
   */
  static formatIterationsArray(iterations: number[]): string {
    return iterations.join(' ')
  }

  /**
   * 验证迭代字符串
   */
  static validateIterationsString(iterationsStr: string): { isValid: boolean; error?: string } {
    if (!iterationsStr.trim()) {
      return { isValid: true }
    }

    const iterations = iterationsStr.split(/\s+/).map(s => s.trim()).filter(s => s)
    
    for (const iter of iterations) {
      const num = parseInt(iter)
      if (isNaN(num) || num <= 0) {
        return {
          isValid: false,
          error: `无效的迭代次数: ${iter}`
        }
      }
    }

    return { isValid: true }
  }
}