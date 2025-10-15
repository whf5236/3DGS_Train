<template>
  <div class="point-cloud-processor">
    <div class="processor-layout">
      <!-- 左侧：文件夹选择 -->
      <div class="glass-card layout-left">
        <div class="card-header">
          <h6><el-icon><Folder /></el-icon> 图片文件夹</h6>
        </div>
        <div class="card-body">
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">加载中...</span>
            </div>
            <p class="mt-3">加载文件夹...</p>
          </div>

          <div v-else-if="folders.length === 0" class="text-center py-5">
            <i class="fas fa-folder-open fa-4x text-muted mb-3"></i>
            <p class="text-muted">未找到图片文件夹</p>
            <p class="text-muted small">请先在文件上传页面上传图片</p>
          </div>

          <div v-else class="folder-list">
            <div v-for="folder in folders" :key="folder.name" class="folder-item"
              :class="{ 'active': selectedFolder === folder.name }" @click="selectFolder(folder)">
              <div class="folder-icon">
                <el-icon color="#409EFF" size="20"><Folder /></el-icon>
              </div>
              <div class="folder-info">
                <div class="folder-name">{{ folder.name }}</div>
              </div>
              <div class="folder-action">
                <button class="btn btn-sm btn-primary" @click.stop="processFolder(folder)"
                  :disabled="isProcessing || processingFolder === folder.name">
                  <i class="fas" :class="processingFolder === folder.name ? 'fa-spinner fa-spin' : 'fa-play'"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：处理状态和结果 -->
      <div class="glass-card layout-right">
        <div class="card-header">
          <h6><el-icon><Connection /></el-icon> 点云处理</h6>
        </div>
        <div class="card-body">
          <div v-if="!selectedFolder && !currentTask" class="text-center py-5">
            <i class="fas fa-cube fa-4x text-muted mb-3"></i>
            <p class="text-muted">选择文件夹进行处理</p>
            <p class="text-muted small">处理时间取决于图片数量，可能需要几分钟</p>
          </div>

          <div v-else-if="currentTask" class="processing-status">
            <h5 class="mb-4">
              Processing: {{ processingFolder }}
              <span class="badge bg-primary ms-2">{{ currentTask.status }}</span>
            </h5>

            <div class="progress mb-4" style="height: 25px;">
              <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar"
                :style="{ width: `${currentTask.progress}%` }" :class="{
                  'bg-success': currentTask.status === 'completed',
                  'bg-danger': currentTask.status === 'failed',
                  'bg-warning': currentTask.status === 'cancelled'
                }">
                {{ currentTask.progress }}%
              </div>
            </div>

            <div class="alert" :class="{
              'alert-info': currentTask.status === 'processing',
              'alert-success': currentTask.status === 'completed',
              'alert-danger': currentTask.status === 'failed',
              'alert-warning': currentTask.status === 'cancelled'
            }">
              <i class="fas" :class="{
                'fa-info-circle': currentTask.status === 'processing',
                'fa-check-circle': currentTask.status === 'completed',
                'fa-exclamation-circle': currentTask.status === 'failed',
                'fa-ban': currentTask.status === 'cancelled'
              }"></i>
              {{ currentTask.message }}
            </div>

            <div v-if="currentTask.status === 'processing'" class="mt-3">
              <button class="btn btn-danger" @click="cancelTask">
                <i class="fas fa-stop me-2"></i> 取消处理
              </button>
            </div>

            <div v-if="currentTask.status === 'completed'" class="mt-4">
              <h6 class="mb-3">处理结果</h6>
              <div class="result-info">
                <p><strong>处理时间:</strong> {{ formatTime(currentTask.processing_time) }}</p>
                <p><strong>输出文件夹:</strong> {{ currentTask.output_folder }}</p>
              </div>
              <div class="mt-3">
                <button class="btn btn-success me-2" @click="viewResults">
                  <i class="fas fa-eye me-2"></i> 查看结果
                </button>
                <button class="btn btn-primary" @click="resetTask">
                  <i class="fas fa-redo me-2"></i> 处理另一个文件夹
                </button>
              </div>
            </div>

            <div v-if="currentTask.status === 'failed'" class="mt-4">
              <button class="btn btn-primary" @click="resetTask">
                <i class="fas fa-redo me-2"></i> 重试
              </button>
            </div>
          </div>

          <div v-else-if="selectedFolder" class="folder-details-view">
            <h5 class="mb-4">{{ selectedFolder }}</h5>

            <div class="folder-summary mb-4">
              <div class="row">
                <div class="col-md-6">
                  <div class="info-card">
                    <div class="info-icon">
                      <i class="fas fa-images"></i>
                    </div>
                    <div class="info-content">
                      <div class="info-label">图片数量</div>
                      <div class="info-value">{{ selectedFolderDetails?.image_count || 0 }}</div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="info-card">
                    <div class="info-icon">
                      <i class="fas fa-calendar-alt"></i>
                    </div>
                    <div class="info-content">
                      <div class="info-label">创建时间</div>
                      <div class="info-value">{{ formatDate(selectedFolderDetails?.created_time) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="processing-options">
              <h6 class="section-title"><el-icon><Setting /></el-icon> 处理选项</h6>
              <div class="row">
                <div class="col-12">
                  <div class="form-check">
                <input class="form-check-input" type="checkbox" :checked="processingOptions.resize" @change="updateProcessingOptions" id="resizeOption">
                <label class="form-check-label" for="resizeOption">
                  生成缩放后的图片（推荐）
                </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="processing-actions">
              <div class="row">
                <div class="col-md-6">
                  <button class="btn btn-primary btn-lg w-100" @click="processSelectedFolder" :disabled="isProcessing">
                    <el-icon v-if="isProcessing"><Loading /></el-icon>
                    <el-icon v-else><VideoPlay /></el-icon>
                    {{ isProcessing ? '处理中...' : '开始处理' }}
              </button>
                </div>
                <div class="col-md-6">
                  <button class="btn btn-outline-secondary btn-lg w-100" @click="cancelSelection" :disabled="isProcessing">
                    <el-icon><CircleClose /></el-icon>
                    取消
              </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 处理结果列表 -->
    <div class="glass-card mt-4">
      <div class="card-header">
        <h6><el-icon><Clock /></el-icon> 处理历史</h6>
      </div>
      <div class="card-body">
        <div v-if="loadingResults" class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">加载中...</span>
          </div>
          <p class="mt-3">加载处理历史...</p>
        </div>

        <div v-else-if="results.length === 0" class="text-center py-4">
          <i class="fas fa-history fa-3x text-muted mb-3"></i>
          <p class="text-muted">未找到处理历史</p>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>文件夹</th>
                <th>状态</th>
                <th>处理时间</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="result in results" :key="result.task_id || result.name">
                <td>{{ result.source_path ? result.source_path.split('/').pop() : result.name }}</td>
                <td>
                  <span class="badge" :class="{
                    'bg-success': result.status === 'completed',
                    'bg-danger': result.status === 'failed',
                    'bg-warning': result.status === 'cancelled',
                    'bg-secondary': result.status === 'unknown'
                  }">{{ result.status }}</span>
                </td>
                <td>{{ result.processing_time ? formatTime(result.processing_time) : 'N/A' }}</td>
                <td>{{ result.timestamp ? formatDate(result.timestamp) : 'Unknown' }}</td>
                <td>
                  <button class="btn btn-sm btn-outline-primary me-1" 
                          style="max-width: 32px; max-height: 32px;" 
                          @click="viewResultDetails(result)">
                    <i class="fas fa-eye"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <el-dialog v-model="resultsDialogVisible" :title="`'${selectedResultFolder}' 的处理结果`" width="50%" class="glass-dialog">
      <el-table :data="currentResultFiles" stripe style="width: 100%">
        <el-table-column prop="name" label="文件名" sortable />
        <el-table-column prop="size" label="大小" sortable>
          <template #default="scope">
            {{ formatFileSize(scope.row.size) }}
          </template>
        </el-table-column>
        <el-table-column prop="modified" label="修改日期" sortable>
          <template #default="scope">
            {{ new Date(scope.row.modified * 1000).toLocaleString() }}
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeResultsDialog">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="PointCloudProcess">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { usePointCloudStore } from '@/stores/pointCloudStore'
import { 
  Folder, 
  Connection, 
  Setting, 
  VideoPlay, 
  CircleClose, 
  Clock, 
  Loading 
} from '@element-plus/icons-vue'

// 使用 Pinia store
const pointCloudStore = usePointCloudStore()

// 计算属性
const loading = computed(() => pointCloudStore.loading)
const loadingResults = computed(() => pointCloudStore.loadingResults)
const folders = computed(() => pointCloudStore.folders)
const results = computed(() => pointCloudStore.results)
const selectedFolder = computed(() => pointCloudStore.selectedFolder)
const selectedFolderDetails = computed(() => pointCloudStore.selectedFolderDetails)
const processingFolder = computed(() => pointCloudStore.processingFolder)
const currentTask = computed(() => pointCloudStore.currentTask)
const processingOptions = computed(() => pointCloudStore.processingOptions)
const resultsDialogVisible = computed(() => pointCloudStore.resultsDialogVisible)
const currentResultFiles = computed(() => pointCloudStore.currentResultFiles)
const selectedResultFolder = computed(() => pointCloudStore.selectedResultFolder)

const isProcessing = computed(() => {
  return !!(currentTask.value && currentTask.value.status === 'processing')
})

// 生命周期钩子
onMounted(() => {
  pointCloudStore.fetchFolders()
  pointCloudStore.fetchResults()

  
})


// 方法
const selectFolder = (folder: any) => {
  pointCloudStore.selectFolder(folder)
}

const cancelSelection = () => {
  pointCloudStore.cancelSelection()
}

const processFolder = async (folder: any) => {
  await pointCloudStore.startProcessing(folder.name)
}

const processSelectedFolder = async () => {
  if (!selectedFolder.value) return
  await pointCloudStore.startProcessing(selectedFolder.value)
}

const cancelTask = async () => {
  await pointCloudStore.cancelTask()
}

const resetTask = () => {
  pointCloudStore.resetTask()
}

const viewResults = async () => {
  if (processingFolder.value) {
    await pointCloudStore.viewResultFiles(processingFolder.value)
  }
}

const viewResultDetails = async (result: any) => {
  const folderName = result.source_path ? result.source_path.split('/').pop() : result.name
  await pointCloudStore.viewResultFiles(folderName)
}

const closeResultsDialog = () => {
  pointCloudStore.closeResultsDialog()
}

const handleAutoProcess = (data: any) => {
  if (data && data.folder_name) {
    // 自动选择并处理指定的文件夹
    const folder = folders.value.find((f: any) => f.name === data.folder_name)
    if (folder) {
      selectFolder(folder)
      processSelectedFolder()
    }
  }
}

const updateProcessingOptions = (event: Event) => {
  const target = event.target as HTMLInputElement
  pointCloudStore.updateProcessingOptions({ resize: target.checked })
}

const formatTime = (seconds: number | undefined): string => {
  if (!seconds) return 'N/A'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

const formatDate = (timestamp: number | undefined): string => {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp * 1000).toLocaleString()
}

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped src="../../asset/porgress/pointCloudProcessor.css">

</style>
