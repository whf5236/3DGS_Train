<template>
  <div class="video-upload-container">
    <el-row :gutter="24">
      <!-- 左侧：上传区域 -->
      <el-col :span="12">
        <!-- 帧率提取配置 -->
        <el-card class="frame-extraction-config" shadow="hover">
          <template #header>
            <span class="config-title">
              <el-icon><Setting /></el-icon> 帧提取配置
            </span>
          </template>
          
          <div class="config-content">
            <div class="config-item">
              <label class="config-label">提取帧率 (fps):</label>
              <el-slider
                v-model="frameRate"
                :min="1"
                :max="30"
                :step="1"
                :disabled="extractAllFrames"
                show-input
                :format-tooltip="(value: number) => `${value} fps`"
                class="frame-rate-slider"
              />
            </div>
            
            <div class="config-item">
              <el-checkbox v-model="extractAllFrames" class="extract-all-checkbox">
                提取所有帧 (忽略帧率设置)
              </el-checkbox>
            </div>
          </div>
        </el-card>

        <!-- 视频上传区域 -->
        <el-card class="upload-area" shadow="hover">
          <template #header>
            <span class="upload-title">
              <el-icon><VideoPlay /></el-icon> 视频上传
            </span>
          </template>
          
          <el-upload
            ref="uploadRef"
            v-model:file-list="fileList"
            class="upload-dragger"
            drag
            :auto-upload="false"
            multiple
            accept="video/*"
            :on-change="handleFileChange"
            :before-upload="beforeUpload"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将视频文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 mp4/avi/mov/mkv/webm 格式，单个文件不超过 500MB
              </div>
            </template>
          </el-upload>
        </el-card>

        <!-- 文件列表 -->
        <el-card v-if="fileList.length" class="file-list-card" shadow="hover">
          <template #header>
            <div class="file-list-header">
              <span>已选择文件 ({{ fileList.length }})</span>
              <el-button size="small" @click="clearFiles" :icon="Delete">清空</el-button>
            </div>
          </template>
          
          <div class="file-list">
            <div
              v-for="file in fileList"
              :key="file.uid"
              :class="['file-item', { selected: selectedFile?.uid === file.uid }]"
              @click="handleSelectFile(convertToPreviewFormat(file))"
            >
              <div class="file-content">
                <div class="file-icon">
                  <el-icon><VideoPlay /></el-icon>
                </div>
                <div class="file-info">
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-details">
                    <span class="file-type">{{ getFileExtension(file.name).toUpperCase() }}</span>
                    <span class="file-size">{{ formatFileSize(file.size || 0) }}</span>
                  </div>
                </div>
              </div>
              <el-button
                type="danger"
                size="small"
                circle
                @click.stop="removeFile(file)"
                :icon="Delete"
              />
            </div>
          </div>
        </el-card>

        <!-- 自定义文件夹名称 -->
        <el-card class="folder-config" shadow="hover">
          <template #header>
            <span class="config-title">
              <el-icon><Folder /></el-icon> 文件夹配置
            </span>
          </template>
          
          <el-input
            v-model="folderName"
            placeholder="输入自定义文件夹名称（可选）"
            clearable
            :prefix-icon="Folder"
          />
        </el-card>

        <!-- 上传按钮 -->
        <div class="upload-actions">
          <el-button
            type="primary"
            size="large"
            @click="submitUpload"
            :loading="uploading"
            :disabled="!fileList.length"
            class="upload-button"
          >
            <el-icon><Upload /></el-icon>
            {{ uploading ? '处理中...' : '开始上传并提取帧' }}
          </el-button>
        </div>
      </el-col>

      <!-- 右侧：文件预览区域 -->
      <el-col :span="12">
        <FilePreview
          :selected-file="selectedFile"
          :file-list="previewFileList"
          @select-file="handleSelectFile"
        />
      </el-col>
    </el-row>

    <!-- 上传进度显示 -->
    <el-card v-if="uploadProgress.show" class="progress-card" shadow="hover">
      <template #header>
        <div class="progress-header">
          <span>处理进度</span>
          <el-tag :type="uploadProgress.status === 'success' ? 'success' : 'primary'">
            {{ uploadProgress.completed }}/{{ uploadProgress.total }}
          </el-tag>
        </div>
      </template>
      
      <el-progress
        :percentage="uploadProgress.percentage"
        :status="uploadProgress.status"
        :stroke-width="8"
      />
      
      <div class="progress-details" style="margin-top: 10px;">
        <p><strong>目标文件夹:</strong> {{ uploadProgress.targetFolder }}</p>
        <p v-if="uploadProgress.currentFile">
          <strong>当前处理:</strong> {{ uploadProgress.currentFile }}
        </p>
        <p v-if="uploadProgress.frameExtractionStatus">
          <strong>帧提取状态:</strong> {{ uploadProgress.frameExtractionStatus }}
        </p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts" name="VideoUpload">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  UploadFilled,
  Delete,
  VideoPlay,
  Upload,
  Setting,
  Folder,
} from '@element-plus/icons-vue'
import type { UploadProps, UploadUserFile, UploadRawFile } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import { api } from '@/api'
import { reactive } from 'vue'
import FilePreview from './FilePreview.vue'

const fileList = ref<UploadUserFile[]>([])
const selectedFile = ref<any>(null)

// 帧率提取相关配置
const frameRate = ref(5) // 默认5fps
const extractAllFrames = ref(false)
const userStore = useUserStore()
const username = computed(() => userStore.user?.username || '')
const folderName = ref('')
const uploading = ref(false)
// 上传进度
const uploadProgress = reactive({
  show: false,
  percentage: 0,
  completed: 0,
  total: 0,
  status: 'info' as 'info' | 'success' | 'warning' | 'exception',
  targetFolder: '',
  currentFile: '',
  frameExtractionStatus: ''
})

const beforeUpload = (rawFile: UploadRawFile) => {
  // 检查文件大小
  const maxSize = 500 * 1024 * 1024 // 500MB
  if (rawFile.size > maxSize) {
    ElMessage.error('文件大小不能超过 500MB')
    return false
  }
  
  // 检查文件类型
  const allowedTypes = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv']
  const fileExtension = rawFile.name.split('.').pop()?.toLowerCase()
  
  if (!fileExtension || !allowedTypes.includes(fileExtension)) {
    ElMessage.error(`不支持的视频格式: ${fileExtension}。支持的格式: ${allowedTypes.join(', ')}`)
    return false
  }
  
  return true
}

const handleFileChange: UploadProps['onChange'] = (uploadFile, uploadFiles) => {
  // 验证文件类型
  if (uploadFile.raw) {
    const allowedTypes = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv']
    const fileExtension = uploadFile.name?.split('.').pop()?.toLowerCase()
    
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      ElMessage.error(`不支持的视频格式: ${fileExtension}。支持的格式: ${allowedTypes.join(', ')}`)
      return
    }
  }
  
  fileList.value = uploadFiles
  if (uploadFile.raw) {
    selectedFile.value = convertToPreviewFormat(uploadFile)
  }
}

const removeFile = (file: UploadUserFile) => {
  const index = fileList.value.findIndex(f => f.uid === file.uid)
  if (index > -1) {
    fileList.value.splice(index, 1)
    // 如果删除的是当前选中的文件，清空选中状态
    if (selectedFile.value && selectedFile.value.uid === file.uid) {
      selectedFile.value = null
    }
  }
}

const clearFiles = () => {
  fileList.value = []
  selectedFile.value = null
}

// 转换文件格式以适配 FilePreview 组件
const convertToPreviewFormat = (uploadFile: UploadUserFile) => {
  if (!uploadFile.raw) return null
  
  const file = uploadFile.raw
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
  
  return {
    filename: file.name,
    type: fileExtension,
    size: file.size,
    path: uploadFile.url || URL.createObjectURL(file),
    uid: uploadFile.uid
  }
}

// 为 FilePreview 组件准备文件列表
const previewFileList = computed(() => {
  return fileList.value
    .filter(file => file.raw)
    .map(file => convertToPreviewFormat(file))
    .filter(file => file !== null)
})

const handleSelectFile = (file: any) => {
  selectedFile.value = file
}

const getFileExtension = (filename: string) => {
  return filename.split('.').pop()?.toLowerCase() || ''
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}


async function submitUpload() {
  if (!username.value) {
    ElMessage.error('请先登录，无法获取用户名')
    return
  }
  if (!fileList.value.length) {
    ElMessage.warning('请先选择至少一个视频文件')
    return
  }

  const form = new FormData()
  form.append('username', username.value)
  
  // 添加帧率提取参数
  if (extractAllFrames.value) {
    form.append('extract_all_frames', 'true')
  } else {
    form.append('frame_rate', frameRate.value.toString())
  }
  
  if (folderName.value && folderName.value.trim()) {
    form.append('folder_name', folderName.value.trim())
  }
  
  for (const f of fileList.value) {
    if (f.raw) form.append('files', f.raw, f.name)
  }

  try {
    uploading.value = true
    uploadProgress.show = true
    uploadProgress.percentage = 0
    uploadProgress.status = 'info'
    uploadProgress.total = fileList.value.length
    uploadProgress.completed = 0
    uploadProgress.frameExtractionStatus = '准备开始处理...'

    // 使用新的带帧提取功能的API端点
    const endpoint = fileList.value.length === 1 
      ? '/upload/videos_with_frame_extraction' 
      : '/upload/batch_videos_with_frame_extraction'

    const res = await api.post(endpoint, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          uploadProgress.percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        }
      }
    })

    uploadProgress.status = 'success'
    uploadProgress.percentage = 100
    uploadProgress.completed = fileList.value.length
    uploadProgress.frameExtractionStatus = '帧提取完成'
    uploadProgress.targetFolder = res.data.folder_name

    ElMessage.success(`视频上传并帧提取成功：保存至 ${res.data.folder_name}`)
    // 清空列表与自定义名称
    fileList.value = []
    selectedFile.value = null
  } catch (e: any) {
    uploadProgress.status = 'exception'
    const msg = e?.response?.data?.detail || e?.message || '视频处理失败'
    ElMessage.error(msg)
  } finally {
    uploading.value = false
    // 3秒后隐藏进度条
    setTimeout(() => {
      uploadProgress.show = false
    }, 3000)
  }
}
</script>

<style scoped src="../../asset/upload/videoUpload.css">
</style>
