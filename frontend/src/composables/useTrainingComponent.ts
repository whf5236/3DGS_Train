import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElNotification, ElMessage, ElMessageBox } from 'element-plus'
import { useTrainingStore } from '@/stores/trainingStore'
import { TrainingParams } from '@/utils/trainingParams'
import { TrainingUtils } from '@/utils/trainingUtils'

export function useTrainingComponent() {
  const trainingStore = useTrainingStore()
  const router = useRouter()

  // 用于处理空格分隔的迭代列表
  const testIterationsInput = ref("7000 30000")
  const saveIterationsInput = ref("7000 30000")
  const checkpointIterationsInput = ref("")

  // 计算属性
  const parsedTestIterations = computed(() => TrainingParams.parseIterations(testIterationsInput.value))
  const parsedSaveIterations = computed(() => TrainingParams.parseIterations(saveIterationsInput.value))
  const parsedCheckpointIterations = computed(() => TrainingParams.parseIterations(checkpointIterationsInput.value))

  // 业务逻辑方法
  const resetParams = () => {
    trainingStore.resetTrainingParams()
    
    // 重置输入框
    const defaultParams = TrainingParams.getDefaultParams()
    testIterationsInput.value = TrainingParams.formatIterationsArray(defaultParams.test_iterations)
    saveIterationsInput.value = TrainingParams.formatIterationsArray(defaultParams.save_iterations)
    checkpointIterationsInput.value = TrainingParams.formatIterationsArray(defaultParams.checkpoint_iterations)
    
    ElNotification({
      title: '操作成功',
      message: '所有训练参数已恢复默认设置',
      type: 'success',
      position: 'top-right',
      duration: 2000,
      showClose: true
    })
  }

  const startTraining = async () => {
    const selectedFolderDetails = trainingStore.selectedFolderDetails
    const folderValidation = TrainingUtils.validateFolderSelection(selectedFolderDetails)
    
    if (!folderValidation.isValid) {
      ElNotification({
        title: '操作失败',
        message: folderValidation.error,
        type: 'error',
        position: 'top-right',
        duration: 2000,
        showClose: true
      })
      return
    }

    try {
      await trainingStore.startTraining()
    } catch (error) {
      console.error('启动训练失败:', error)
    }
  }

  const cancelTask = async () => {
    try {
      await trainingStore.cancelTraining()
      
      // 延迟刷新结果
      setTimeout(() => {
        trainingStore.fetchTrainingResults()
        trainingStore.fetchPointCloudResults()
      }, 1500)
    } catch (error) {
      console.error('取消训练失败:', error)
    }
  }

  const forceReset = () => {
    trainingStore.clearCurrentTask()
    ElNotification({
      title: '操作成功',
      message: '所有训练状态已重置',
      type: 'success',
      position: 'top-right',
      customClass: 'custom-notification',
      duration: 2000
    })
    trainingStore.fetchPointCloudResults()
    trainingStore.fetchTrainingResults()
  }

  const confirmDeleteResult = (result: any) => {
    ElMessageBox.confirm(
      `确定要删除训练结果 "${result.folder_name || result.task_id}" 吗？此操作不可撤销。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    ).then(() => {
      deleteResult(result)
    }).catch(() => {
      ElMessage.info('已取消删除操作')
    })
  }

  const deleteResult = async (result: any) => {
    try {
      await trainingStore.deleteTrainingResult(result.task_id)
      
      ElNotification({
        title: '删除成功',
        message: '训练结果已成功删除',
        type: 'success',
        position: 'top-right',
        duration: 3000,
        showClose: true
      })
      
      // 刷新结果列表
      trainingStore.fetchTrainingResults()
    } catch (error: any) {
      console.error('删除训练结果失败:', error)
      ElMessage.error(`删除失败: ${error.message}`)
    }
  }

  const selectFolder = (folder: any) => {
    trainingStore.setSelectedFolder(folder.folder_name || folder.name)
  }

  const viewResults = () => {
    const currentTask = trainingStore.currentTask
    if (currentTask && currentTask.model_path) {
      router.push(`/results/${currentTask.folder_name}`)
    }
  }

  const initializeIterationInputs = () => {
    const trainingParams = trainingStore.trainingParams
    testIterationsInput.value = TrainingParams.formatIterationsArray(trainingParams.test_iterations)
    saveIterationsInput.value = TrainingParams.formatIterationsArray(trainingParams.save_iterations)
    checkpointIterationsInput.value = TrainingParams.formatIterationsArray(trainingParams.checkpoint_iterations)
  }

  // 格式化方法
  const formatDate = (timestamp: number | undefined) => TrainingUtils.formatTimestamp(timestamp || 0)
  const formatTime = (seconds: number | undefined) => TrainingUtils.formatDuration(seconds || 0)

  const resetTaskState = () => {
    trainingStore.clearCurrentTask()
    ElMessage.info('准备开始新的训练任务。')
  }

  return {
    // 响应式数据
    testIterationsInput,
    saveIterationsInput,
    checkpointIterationsInput,
    
    // 来自 trainingStore 的数据
    folders: computed(() => trainingStore.pointCloudResults),
    loadingFolders: computed(() => trainingStore.isLoading),
    selectedFolder: computed(() => trainingStore.selectedFolder),
    trainingParams: computed(() => trainingStore.trainingParams),
    currentTask: computed(() => trainingStore.currentTask),
    isProcessing: computed(() => trainingStore.isTaskRunning),
    results: computed(() => trainingStore.trainingResults),
    loadingResults: computed(() => trainingStore.isLoading),
    
    // 计算属性
    parsedTestIterations,
    parsedSaveIterations,
    parsedCheckpointIterations,
    
    // 方法
    resetParams,
    startTraining,
    cancelTask,
    forceReset,
    confirmDeleteResult,
    deleteResult,
    selectFolder,
    viewResults,
    initializeIterationInputs,
    resetTaskState,
    formatDate,
    formatTime
  }
}