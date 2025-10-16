import { api } from '@/api'

export interface TrainingTaskData {
  username: string
  source_path: string
  websocket_port: number
  websocket_host: string
  params: any
}

export interface TrainingStatusResponse {
  task_id: string
  status: 'idle' | 'running' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  message: string
  output_logs: string[]
  start_time?: string
  end_time?: string
  folder_name?: string
  model_path?: string
  error?: string
}

export interface ActiveTaskResponse {
  active_tasks: TrainingStatusResponse[]
}

export interface TrainingResultsResponse {
  results: any[]
}

export interface PointCloudResultsResponse {
  results: any[]
}

export interface StartTrainingResponse {
  task_id: string
  status: string
  message: string
  model_path?: string
  visualization?: {
    host: string
    port: number
  }
  websocket?: {
    host: string
    port: number
  }
}

export interface CancelTrainingResponse {
  message: string
}

export class TrainingService {
  /**
   * 启动训练任务
   */
  static async startTraining(taskData: TrainingTaskData): Promise<StartTrainingResponse> {
    const response = await api.post('/training/start', taskData)
    return response.data
  }

  /**
   * 获取训练状态
   */
  static async getTrainingStatus(username: string, taskId: string): Promise<TrainingStatusResponse> {
    const response = await api.get(`/training/status/${username}/${taskId}`)
    return response.data
  }

  /**
   * 检查活跃任务
   */
  static async checkActiveTask(username: string): Promise<ActiveTaskResponse> {
    const response = await api.get(`/training/active/${username}`)
    return response.data
  }

  /**
   * 取消训练任务
   */
  static async cancelTraining(username: string, taskId: string): Promise<CancelTrainingResponse> {
    const response = await api.post(`/training/cancel/${username}/${taskId}`)
    return response.data
  }

  /**
   * 获取训练结果
   */
  static async getTrainingResults(username: string): Promise<TrainingResultsResponse> {
    const response = await api.get(`/training/results/${username}`)
    return response.data
  }

  /**
   * 获取点云处理结果
   */
  static async getPointCloudResults(username: string): Promise<PointCloudResultsResponse> {
    const response = await api.get(`/upload/point-cloud/results/${username}`)
    return response.data
  }

  /**
   * 删除训练结果
   */
  static async deleteTrainingResult(username: string, resultName: string): Promise<void> {
    await api.delete(`/training/results/${username}/${resultName}`)
  }
}