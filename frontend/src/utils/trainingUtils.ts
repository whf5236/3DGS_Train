export class TrainingUtils {
  /**
   * 格式化时间戳
   */
  static formatTimestamp(timestamp: string | number): string {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}秒`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.round(seconds % 60)
      return `${minutes}分${remainingSeconds}秒`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}小时${minutes}分钟`
    }
  }

  /**
   * 验证文件夹选择
   */
  static validateFolderSelection(folderDetails: any): { isValid: boolean; error?: string } {
    if (!folderDetails) {
      return {
        isValid: false,
        error: '请先选择一个文件夹进行训练'
      }
    }

    if (!folderDetails.image_count || folderDetails.image_count === 0) {
      return {
        isValid: false,
        error: '选择的文件夹中没有图片文件'
      }
    }

    if (folderDetails.image_count < 3) {
      return {
        isValid: false,
        error: '训练至少需要3张图片，当前文件夹只有' + folderDetails.image_count + '张图片'
      }
    }

    return { isValid: true }
  }

  /**
   * 获取训练状态的显示文本
   */
  static getStatusDisplayText(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': '等待中',
      'running': '训练中',
      'completed': '已完成',
      'failed': '失败',
      'cancelled': '已取消'
    }
    return statusMap[status] || status
  }

  /**
   * 获取训练状态的颜色类型
   */
  static getStatusType(status: string): 'success' | 'warning' | 'danger' | 'info' {
    const typeMap: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      'pending': 'info',
      'running': 'warning',
      'completed': 'success',
      'failed': 'danger',
      'cancelled': 'info'
    }
    return typeMap[status] || 'info'
  }

  /**
   * 计算训练进度百分比
   */
  static calculateProgress(currentIteration: number, totalIterations: number): number {
    if (!totalIterations || totalIterations === 0) return 0
    return Math.min(Math.round((currentIteration / totalIterations) * 100), 100)
  }

  /**
   * 验证训练参数
   */
  static validateTrainingParams(params: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (params.iterations <= 0) {
      errors.push('迭代次数必须大于0')
    }

    if (params.position_lr_init <= 0) {
      errors.push('位置学习率初始值必须大于0')
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

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 检查是否为有效的数字
   */
  static isValidNumber(value: any): boolean {
    return !isNaN(value) && isFinite(value) && value !== null && value !== undefined
  }

  /**
   * 生成唯一的任务ID
   */
  static generateTaskId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}