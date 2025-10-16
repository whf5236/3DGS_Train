import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { TrainingService, type TrainingStatusResponse, type TrainingTaskData } from '@/services/trainingService'
import { TrainingParams, type TrainingParameters } from '@/utils/trainingParams'
import { useUserStore } from './userStore'
import { ElMessage, ElNotification } from 'element-plus'

export interface TrainingTask {
  id: string
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

export interface TrainingResult {
  name: string
  path: string
  created_at: string
  size: number
  model_path?: string
}

export interface PointCloudResult {
  name: string
  path: string
  created_at: string
  size: number
}

export const useTrainingStore = defineStore('training', () => {
  // 状态
  const currentTask = ref<TrainingTask | null>(null)
  const trainingParams = ref<TrainingParameters>(TrainingParams.getDefaultParams())
  const trainingResults = ref<TrainingResult[]>([])
  const pointCloudResults = ref<PointCloudResult[]>([])
  const selectedFolder = ref<string>('')
  const isLoading = ref(false)
  const isTraining = ref(false)
  const websocketConnected = ref(false)
  const websocketPort = ref<number | null>(null)
  const websocketHost = ref<string>('localhost')

  // 计算属性
  const hasActiveTask = computed(() => currentTask.value !== null)
  const isTaskRunning = computed(() => 
    currentTask.value?.status === 'running' || currentTask.value?.status === 'processing'
  )
  const taskProgress = computed(() => currentTask.value?.progress || 0)
  const canStartTraining = computed(() => 
    selectedFolder.value && !isTaskRunning.value && !isLoading.value
  )
  const selectedFolderDetails = computed(() => 
    pointCloudResults.value.find(f => 
      f.name === selectedFolder.value
    )
  )

  // 获取用户store
  const userStore = useUserStore()

  // Actions
  const setTrainingParams = (params: Partial<TrainingParameters>) => {
    trainingParams.value = { ...trainingParams.value, ...params }
  }

  const resetTrainingParams = () => {
    trainingParams.value = TrainingParams.getDefaultParams()
  }

  const setSelectedFolder = (folder: string) => {
    selectedFolder.value = folder
  }

  const setCurrentTask = (task: TrainingTask | null) => {
    currentTask.value = task
    isTraining.value = task?.status === 'running' || task?.status === 'processing'
  }

  const clearCurrentTask = () => {
    currentTask.value = null
    isTraining.value = false
  }

  const updateTaskStatus = (status: Partial<TrainingTask>) => {
    if (currentTask.value) {
      currentTask.value = { ...currentTask.value, ...status }
      isTraining.value = currentTask.value.status === 'running' || currentTask.value.status === 'processing'
    }
  }

  const setWebsocketInfo = (host: string, port: number) => {
    websocketHost.value = host
    websocketPort.value = port
  }

  const setWebsocketConnected = (connected: boolean) => {
    websocketConnected.value = connected
  }

  // 检查活跃任务
  const checkActiveTask = async () => {
    try {
      const username = userStore.user?.username
      if (!username) return

      const response = await TrainingService.checkActiveTask(username)
      if (response.active_tasks && response.active_tasks.length > 0) {
        const activeTask = response.active_tasks[0]
        if (activeTask) {
          setCurrentTask({
            id: activeTask.task_id,
            status: activeTask.status,
            progress: activeTask.progress,
            message: activeTask.message,
            output_logs: activeTask.output_logs,
            start_time: activeTask.start_time,
            end_time: activeTask.end_time,
            folder_name: activeTask.folder_name,
            model_path: activeTask.model_path,
            error: activeTask.error
          })
        }
      } else {
        clearCurrentTask()
      }
    } catch (error) {
      console.error('检查活跃任务失败:', error)
    }
  }

  // 获取训练状态
  const getTrainingStatus = async (taskId: string) => {
    try {
      const username = userStore.user?.username
      if (!username) return

      const response = await TrainingService.getTrainingStatus(username, taskId)
      updateTaskStatus({
        status: response.status,
        progress: response.progress,
        message: response.message,
        output_logs: response.output_logs,
        end_time: response.end_time,
        model_path: response.model_path,
        error: response.error
      })
    } catch (error) {
      console.error('获取训练状态失败:', error)
    }
  }

  // 启动训练
  const startTraining = async () => {
    try {
      isLoading.value = true
      const username = userStore.user?.username
      if (!username) {
        throw new Error('用户未登录')
      }

      if (!selectedFolder.value) {
        throw new Error('请选择文件夹')
      }

      // 验证参数
      const validation = TrainingParams.validateParams(trainingParams.value)
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }

      const taskData: TrainingTaskData = {
        username,
        source_path: selectedFolder.value,
        websocket_port: websocketPort.value || 8765,
        websocket_host: websocketHost.value,
        params: TrainingParams.formatParamsForAPI(trainingParams.value)
      }

      const response = await TrainingService.startTraining(taskData)
      
      setCurrentTask({
        id: response.task_id,
        status: 'running',
        progress: 0,
        message: response.message,
        output_logs: [],
        start_time: new Date().toISOString(),
        model_path: response.model_path
      })

      // 设置WebSocket信息
      if (response.websocket) {
        setWebsocketInfo(response.websocket.host, response.websocket.port)
      }

      ElMessage.success('训练任务已启动')
      return response
    } catch (error) {
      console.error('启动训练失败:', error)
      ElMessage.error(error instanceof Error ? error.message : '启动训练失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 取消训练
  const cancelTraining = async () => {
    try {
      const username = userStore.user?.username
      if (!username || !currentTask.value) return

      await TrainingService.cancelTraining(username, currentTask.value.id)
      updateTaskStatus({ status: 'cancelled' })
      ElMessage.success('训练任务已取消')
    } catch (error) {
      console.error('取消训练失败:', error)
      ElMessage.error('取消训练失败')
    }
  }

  // 获取训练结果
  const fetchTrainingResults = async () => {
    try {
      const username = userStore.user?.username
      if (!username) return

      const response = await TrainingService.getTrainingResults(username)
      trainingResults.value = response.results
    } catch (error) {
      console.error('获取训练结果失败:', error)
    }
  }

  // 获取点云结果
  const fetchPointCloudResults = async () => {
    try {
      const username = userStore.user?.username
      if (!username) return

      const response = await TrainingService.getPointCloudResults(username)
      pointCloudResults.value = response.results
    } catch (error) {
      console.error('获取点云结果失败:', error)
    }
  }

  // 删除训练结果
  const deleteTrainingResult = async (taskId: string) => {
    try {
      const username = userStore.user?.username
      if (!username) return

      await TrainingService.deleteTrainingResult(username, taskId)
      
      // 刷新训练结果列表
      await fetchTrainingResults()
      
      ElMessage.success('删除成功')
      return { success: true }
    } catch (error) {
      console.error('删除训练结果失败:', error)
      ElMessage.error('删除失败')
      throw error
    }
  }

  // 处理训练状态更新（WebSocket回调）
  const handleTrainingStatusUpdate = (data: any) => {
    if (!data || !data.task_id) {
      console.warn('Received invalid training status update:', data)
      return
    }

    // Only process updates for the current task
    if (!currentTask.value || currentTask.value.id !== data.task_id) {
      console.log(`Ignoring status update for task ${data.task_id} (current task: ${currentTask.value?.id})`)
      return
    }

    console.log('Processing training status update:', data)

    updateTaskStatus({
      status: data.status,
      progress: data.progress || 0,
      message: data.message || '',
      output_logs: data.output_logs || currentTask.value.output_logs,
      end_time: data.end_time,
      error: data.error
    })

    // Handle final states with notifications
    if (data.status === 'completed') {
      ElMessage({
        message: '训练任务已成功完成！',
        type: 'success',
        duration: 5000,
        showClose: true
      })
      
      // Delay reset to allow user to see completion status
      setTimeout(() => {
        clearCurrentTask()
        fetchTrainingResults()
        fetchPointCloudResults()
      }, 3000)
      
    } else if (data.status === 'failed') {
      ElMessage({
        message: '训练任务失败: ' + (data.error || '未知错误'),
        type: 'error',
        duration: 0, // Don't auto-close error notifications
        showClose: true
      })
      
      // Delay reset to allow user to see error status
      setTimeout(() => {
        clearCurrentTask()
        fetchTrainingResults()
      }, 5000)
      
    } else if (data.status === 'cancelled') {
      ElMessage({
        message: '训练任务已被取消',
        type: 'warning',
        duration: 3000,
        showClose: true
      })
      
      setTimeout(() => {
        clearCurrentTask()
        fetchTrainingResults()
      }, 2000)
    }
  }

  // 初始化
  const initialize = async () => {
    await checkActiveTask()
    await fetchTrainingResults()
    await fetchPointCloudResults()
  }

  return {
    // 状态
    currentTask,
    trainingParams,
    trainingResults,
    pointCloudResults,
    selectedFolder,
    isLoading,
    isTraining,
    websocketConnected,
    websocketPort,
    websocketHost,

    // 计算属性
    hasActiveTask,
    isTaskRunning,
    taskProgress,
    canStartTraining,
    selectedFolderDetails,

    // Actions
    setTrainingParams,
    resetTrainingParams,
    setSelectedFolder,
    setCurrentTask,
    clearCurrentTask,
    updateTaskStatus,
    setWebsocketInfo,
    setWebsocketConnected,
    checkActiveTask,
    getTrainingStatus,
    startTraining,
    cancelTraining,
    fetchTrainingResults,
    fetchPointCloudResults,
    deleteTrainingResult,
    handleTrainingStatusUpdate,
    initialize
  }
})