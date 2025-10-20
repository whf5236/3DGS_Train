<template>
  <div class="point-cloud-processor">
    <el-row :gutter="20" class="processor-layout">
      <!-- 左侧：文件夹选择 -->
      <el-col :span="12">
        <el-card class="glass-card">
          <template #header>
            <div class="card-header">
              <h6><el-icon><Folder /></el-icon> 图片文件夹</h6>
            </div>
          </template>
          
          <div v-if="loading" v-loading="loading" class="text-center" style="padding: 40px 0; min-height: 120px;">
            <p>加载文件夹...</p>
          </div>

          <el-empty v-else-if="folders.length === 0" description="未找到图片文件夹">
            <template #image>
              <el-icon size="60"><FolderOpened /></el-icon>
            </template>
            <p style="color: #909399; font-size: 14px;">请先在文件上传页面上传图片</p>
          </el-empty>

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
                <el-button 
                  size="large" 
                  type="primary" 
                  @click.stop="processFolder(folder)"
                  :disabled="isProcessing || processingFolder === folder.name"
                  :loading="processingFolder === folder.name">
                  <el-icon v-if="!processingFolder || processingFolder !== folder.name"><VideoPlay /></el-icon>
                </el-button>
              </div>
            </div>
          </div>

          <!-- 选中文件夹的详细信息 -->
          <div v-if="selectedFolder && selectedFolderDetails" class="folder-details" style="margin-top: 20px;">
            <el-divider content-position="left">
              <span style="font-size: 14px; color: #606266;">文件夹详情</span>
            </el-divider>
            
            <el-row :gutter="16">
              <el-col :span="12">
                <el-card class="info-card" shadow="hover">
                  <div class="info-content">
                    <div class="info-icon">
                      <el-icon size="24" color="#409EFF"><Picture /></el-icon>
                    </div>
                    <div>
                      <div class="info-label">图片数量</div>
                      <div class="info-value">{{ selectedFolderDetails?.image_count || 0 }}</div>
                    </div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card class="info-card" shadow="hover">
                  <div class="info-content">
                    <div class="info-icon">
                      <el-icon size="24" color="#67C23A"><Calendar /></el-icon>
                    </div>
                    <div>
                      <div class="info-label">创建时间</div>
                      <div class="info-value">{{ formatDate(selectedFolderDetails?.created_time) }}</div>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：处理状态和结果 -->
      <el-col :span="12">
        <el-card class="glass-card">
          <template #header>
            <div class="card-header">
              <h6><el-icon><Connection /></el-icon> 点云处理</h6>
            </div>
          </template>
          
          <el-empty v-if="!selectedFolder && !currentTask" description="选择文件夹进行处理">
            <template #image>
              <el-icon size="60"><Box /></el-icon>
            </template>
            <p style="color: #909399; font-size: 14px;">处理时间取决于图片数量，可能需要几分钟</p>
          </el-empty>

          <div v-else-if="currentTask" class="processing-status">
            <h5 style="margin-bottom: 20px;">
              Processing: {{ processingFolder }}
              <el-tag :type="getTaskTagType(currentTask.status)" style="margin-left: 8px;">
                {{ currentTask.status }}
              </el-tag>
            </h5>

            <el-progress 
              :percentage="currentTask.progress" 
              :status="getProgressStatus(currentTask.status)"
              :stroke-width="20"
              text-inside
              style="margin-bottom: 20px;" />

            <el-alert 
              :title="currentTask.message"
              :type="getAlertType(currentTask.status)"
              :closable="false"
              show-icon
              style="margin-bottom: 16px;" />

            <div v-if="currentTask.status === 'processing'">
              <el-button type="danger" @click="cancelTask">
                <el-icon><Close /></el-icon>
                取消处理
              </el-button>
            </div>

            <div v-if="currentTask.status === 'completed'" style="margin-top: 20px;">
              <h6 style="margin-bottom: 16px;">处理结果</h6>
              <div class="result-info">
                <p><strong>处理时间:</strong> {{ formatTime(currentTask.processing_time) }}</p>
                <p><strong>输出文件夹:</strong> {{ currentTask.output_folder }}</p>
              </div>
              <div style="margin-top: 16px;">
                <el-button type="success" @click="viewResults">
                  <el-icon><View /></el-icon>
                  查看结果
                </el-button>
                <el-button type="primary" @click="resetTask">
                  <el-icon><Refresh /></el-icon>
                  处理另一个文件夹
                </el-button>
              </div>
            </div>

            <div v-if="currentTask.status === 'failed'" style="margin-top: 20px;">
              <el-button type="primary" @click="resetTask">
                <el-icon><Refresh /></el-icon>
                重试
              </el-button>
            </div>
          </div>

          <div v-else-if="selectedFolder" class="folder-details-view">
            <h5 style="margin-bottom: 20px;">{{ selectedFolder }}</h5>

            <div class="processing-options" style="margin-bottom: 20px;">
              <h6 class="section-title">
                <el-icon><Setting /></el-icon> COLMAP 处理选项
              </h6>
              
              <!-- 基础选项 -->
              <el-card class="option-card" shadow="never">
                <template #header>
                  <span class="option-title">基础设置</span>
                </template>
                
                <el-form :model="processingOptions" label-width="120px" size="small">
                  <el-form-item label="输出文件夹名">
                    <el-input 
                      v-model="processingOptions.output_folder_name" 
                      :placeholder="getDefaultOutputFolderName()"
                      @input="updateProcessingOptionsValue">
                      <template #prepend>
                        <el-icon><Folder /></el-icon>
                      </template>
                    </el-input>
                    <div class="option-description">
                      <small>留空则自动将 'image' 前缀改为 'colmap'，或输入自定义文件夹名</small>
                    </div>
                  </el-form-item>
                  
                  <el-form-item label="相机模型">
                    <el-select v-model="processingOptions.camera_model" @change="updateProcessingOptionsValue">
                      <el-option label="OPENCV" value="OPENCV" />
                      <el-option label="PINHOLE" value="PINHOLE" />
                      <el-option label="RADIAL" value="RADIAL" />
                      <el-option label="SIMPLE_RADIAL" value="SIMPLE_RADIAL" />
                    </el-select>
                    <div class="option-description">
                      <small>OPENCV：适用于大多数相机；PINHOLE：理想针孔相机模型</small>
                    </div>
                  </el-form-item>
                </el-form>
              </el-card>
              
              <!-- 高级选项 -->
              <el-card class="option-card" shadow="never" style="margin-top: 16px;">
                <template #header>
                  <span class="option-title">高级设置</span>
                </template>
                
                <el-form :model="processingOptions" label-width="120px" size="small">
                  <el-form-item>
                    <el-checkbox 
                      v-model="processingOptions.no_gpu" 
                      @change="updateProcessingOptionsValue">
                      禁用 GPU 加速
                    </el-checkbox>
                    <div class="option-description">
                      <small>如果遇到 GPU 相关问题，可以禁用 GPU 加速</small>
                    </div>
                  </el-form-item>
                  
                  <el-form-item>
                    <el-checkbox 
                      v-model="processingOptions.skip_matching" 
                      @change="updateProcessingOptionsValue">
                      跳过特征匹配
                    </el-checkbox>
                    <div class="option-description">
                      <small>如果已有预处理的特征数据，可以跳过特征提取和匹配步骤</small>
                    </div>
                  </el-form-item>
                  
                  <el-form-item>
                    <el-checkbox 
                      v-model="processingOptions.resize" 
                      @change="updateProcessingOptionsValue">
                      生成多分辨率图像
                    </el-checkbox>
                    <div class="option-description">
                      <small>生成 50%、25%、12.5% 分辨率的图像，用于多尺度训练</small>
                    </div>
                  </el-form-item>
                </el-form>
              </el-card>
  
            </div>

            <div class="processing-actions">
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-button 
                    type="primary" 
                    size="large" 
                    style="width: 100%;" 
                    @click="processSelectedFolder" 
                    :disabled="isProcessing"
                    :loading="isProcessing">
                    <el-icon v-if="!isProcessing"><VideoPlay /></el-icon>
                    {{ isProcessing ? '处理中...' : '开始处理' }}
                  </el-button>
                </el-col>
                <el-col :span="12">
                  <el-button 
                    size="large" 
                    style="width: 100%;" 
                    @click="cancelSelection" 
                    :disabled="isProcessing">
                    <el-icon><CircleClose /></el-icon>
                    取消
                  </el-button>
                </el-col>
              </el-row>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 处理结果列表 -->
    <el-card class="glass-card" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <h6><el-icon><Clock /></el-icon> 处理历史</h6>
        </div>
      </template>
      
      <div v-if="loadingResults" v-loading="loadingResults" class="text-center" style="padding: 40px 0; min-height: 120px;">
        <p>加载处理历史...</p>
      </div>

      <el-empty v-else-if="results.length === 0" description="未找到处理历史">
        <template #image>
          <el-icon size="60"><Clock /></el-icon>
        </template>
      </el-empty>

      <el-table v-else :data="results" stripe style="width: 100%">
        <el-table-column prop="name" label="文件夹">
          <template #default="scope">
            {{ scope.row.source_path ? scope.row.source_path.split('/').pop() : scope.row.name }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="processing_time" label="处理时间">
          <template #default="scope">
            {{ scope.row.processing_time ? formatTime(scope.row.processing_time) : 'N/A' }}
          </template>
        </el-table-column>
        <el-table-column prop="timestamp" label="创建时间">
          <template #default="scope">
            {{ scope.row.timestamp ? formatDate(scope.row.timestamp) : 'Unknown' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="scope">
            <el-button 
              size="small" 
              type="primary" 
              :icon="View"
              circle
              @click="viewResultDetails(scope.row)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog 
      v-model="resultsDialogVisible" 
      :title="`'${selectedResultFolder}' 的处理结果`" 
      width="50%" 
      class="glass-dialog">
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
import { computed, onMounted, } from 'vue'
import { usePointCloudStore } from '@/stores/pointCloudStore'
import { Folder, FolderOpened,Connection, Setting, VideoPlay, 
  CircleClose, Clock, Box,Close,View,Refresh,Picture,Calendar
} from '@element-plus/icons-vue'
import { ElButton,ElDialog,ElTable,ElTableColumn,
  ElTag,ElCard,ElCol,ElRow,ElEmpty,ElIcon } from 'element-plus'

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
  try {
    await pointCloudStore.startProcessing(folder.name)
  } catch (error) {
    console.error('处理文件夹失败:', error)
  }
}

const processSelectedFolder = async () => {
  if (!selectedFolder.value) return
  try {
    await pointCloudStore.startProcessing(selectedFolder.value)
  } catch (error) {
    console.error('处理文件夹失败:', error)
  }
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


const updateProcessingOptionsValue = () => {
  // 这个方法会在任何选项改变时被调用
  // 由于我们使用 v-model 绑定到 processingOptions，
  // 数据会自动更新，这里可以添加额外的逻辑
}

const getDefaultOutputFolderName = (): string => {
  if (!selectedFolder.value) return ''
  
  // 如果文件夹名以 'image' 开头，将其替换为 'colmap'
  if (selectedFolder.value.startsWith('image')) {
    return selectedFolder.value.replace(/^image/, 'colmap')
  }
  
  // 否则在前面添加 'colmap_' 前缀
  return `colmap_${selectedFolder.value}`
}

// Element Plus 组件状态处理方法
const getTaskTagType = (status: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'danger'
    case 'cancelled': return 'warning'
    case 'processing': return 'primary'
    default: return 'info'
  }
}

const getProgressStatus = (status: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'exception'
    case 'cancelled': return 'warning'
    default: return undefined
  }
}

const getAlertType = (status: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'error'
    case 'cancelled': return 'warning'
    case 'processing': return 'info'
    default: return 'info'
  }
}

const getStatusTagType = (status: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'danger'
    case 'cancelled': return 'warning'
    default: return 'info'
  }
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

<style scoped src="../../asset/progress/pointCloudProcessor.css">

</style>
