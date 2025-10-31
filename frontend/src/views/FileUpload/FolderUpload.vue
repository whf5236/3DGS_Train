<template>
  <div class="folder-upload-container">
    <el-row :gutter="24">
      <!-- 左侧：上传区域 -->
      <el-col :span="12">
        <!-- 上传类型选择 -->
        <el-card class="upload-type-config" shadow="hover">
          <template #header>
            <span class="config-title">
              <el-icon><Setting /></el-icon> 上传类型配置
            </span>
          </template>
          
          <div class="config-content">
            <el-radio-group v-model="uploadType" class="upload-type-group">
              <el-radio label="folder" size="large">
                <el-icon><Folder /></el-icon> 文件夹上传
              </el-radio>
              <el-radio label="archive" size="large">
                <el-icon><Document /></el-icon> 压缩包上传
              </el-radio>
            </el-radio-group>
            
            <div class="type-description">
              <p v-if="uploadType === 'folder'">
                选择包含图片的文件夹进行批量上传，支持嵌套文件夹结构
              </p>
              <p v-else>
                上传压缩包文件（.zip, .rar, .7z），系统将自动解压并提取图片文件
              </p>
            </div>
          </div>
        </el-card>

        <!-- 文件夹上传区域 -->
        <el-card v-if="uploadType === 'folder'" class="upload-area" shadow="hover">
          <template #header>
            <span class="upload-title">
              <el-icon><Folder /></el-icon> 文件夹上传
            </span>
          </template>
          
          <el-upload
            ref="folderUploadRef"
            v-model:file-list="fileList"
            class="upload-dragger"
            drag
            :auto-upload="false"
            multiple
            directory
            accept="image/*"
            :on-change="handleFolderChange"
            :before-upload="beforeUpload"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将文件夹拖到此处，或<em>点击选择文件夹</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 jpg/png/gif/bmp/webp 格式，保持原有文件夹结构
              </div>
            </template>
          </el-upload>
        </el-card>

        <!-- 压缩包上传区域 -->
        <el-card v-else class="upload-area" shadow="hover">
          <template #header>
            <span class="upload-title">
              <el-icon><Document /></el-icon> 压缩包上传
            </span>
          </template>
          
          <el-upload
            ref="archiveUploadRef"
            v-model:file-list="archiveList"
            class="upload-dragger"
            drag
            :auto-upload="false"
            :limit="1"
            accept=".zip,.rar,.7z"
            :on-change="handleArchiveChange"
            :before-upload="beforeArchiveUpload"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将压缩包拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 .zip/.rar/.7z 格式，单个文件不超过 100MB
              </div>
            </template>
          </el-upload>
        </el-card>

        <!-- 文件列表 -->
        <el-card v-if="displayFileList.length" class="file-list-card" shadow="hover">
          <template #header>
            <div class="file-list-header">
              <span>
                {{ uploadType === 'folder' ? '文件夹内容' : '压缩包内容' }} 
                ({{ displayFileList.length }})
              </span>
              <el-button size="small" @click="clearFiles" :icon="Delete">清空</el-button>
            </div>
          </template>
          
          <div class="file-list">
            <div
              v-for="file in displayFileList"
              :key="file.uid || file.path"
              :class="['file-item', { selected: selectedFile?.uid === file.uid || selectedFile?.path === file.path }]"
              @click="handleSelectFile(file)"
            >
              <div class="file-content">
                <div class="file-icon">
                  <el-icon><Picture /></el-icon>
                </div>
                <div class="file-info">
                  <div class="file-name">{{ file.name || file.filename }}</div>
                  <div class="file-details">
                    <span class="file-type">{{ getFileExtension(file.name || file.filename).toUpperCase() }}</span>
                    <span class="file-size">{{ formatFileSize(file.size || 0) }}</span>
                    <span v-if="file.path" class="file-path">{{ file.path }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 解压配置 -->
        <el-card v-if="uploadType === 'archive'" class="extract-config" shadow="hover">
          <template #header>
            <span class="config-title">
              <el-icon><Tools /></el-icon> 解压配置
            </span>
          </template>
          
          <div class="config-content">
            <div class="config-item">
              <el-checkbox v-model="extractConfig.preserveStructure">
                保持文件夹结构
              </el-checkbox>
            </div>
            <div class="config-item">
              <el-checkbox v-model="extractConfig.filterImages">
                仅提取图片文件
              </el-checkbox>
            </div>
            <div class="config-item">
              <label class="config-label">最大解压大小 (MB):</label>
              <el-slider
                v-model="extractConfig.maxSize"
                :min="10"
                :max="500"
                :step="10"
                show-input
                class="size-slider"
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
            :disabled="!canUpload"
            class="upload-button"
          >
            <el-icon><Upload /></el-icon>
            {{ uploading ? '处理中...' : getUploadButtonText() }}
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
        <p v-if="uploadProgress.extractionStatus">
          <strong>解压状态:</strong> {{ uploadProgress.extractionStatus }}
        </p>
      </div>
    </el-card>

    <!-- 解压预览对话框 -->
    <el-dialog
      v-model="extractPreviewVisible"
      title="压缩包内容预览"
      width="60%"
      :before-close="handleCloseExtractPreview"
    >
      <div v-if="extracting" class="extract-loading">
        <el-skeleton animated :rows="5" />
        <div class="loading-text">正在解析压缩包...</div>
      </div>
      
      <div v-else-if="extractedFiles.length" class="extract-preview">
        <el-alert
          :title="`发现 ${extractedFiles.length} 个文件`"
          type="info"
          :closable="false"
          style="margin-bottom: 15px;"
        />
        
        <div class="extract-file-list">
          <div
            v-for="file in extractedFiles"
            :key="file.path"
            class="extract-file-item"
          >
            <el-icon><Picture /></el-icon>
            <span class="file-name">{{ file.name }}</span>
            <span class="file-path">{{ file.path }}</span>
            <span class="file-size">{{ formatFileSize(file.size) }}</span>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="extractPreviewVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmExtract" :disabled="!extractedFiles.length">
            确认上传
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="FolderUpload">
import { ref, computed, reactive } from 'vue'
import { ElCard,ElDialog } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  UploadFilled,
  Delete,
  Picture,
  Upload,
  Setting,
  Folder,
  Document,
  Tools,
} from '@element-plus/icons-vue'
import type { UploadProps, UploadUserFile, UploadRawFile } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import { api } from '@/api'
import FilePreview from './FilePreview.vue'
import JSZip from 'jszip'

// 上传类型
const uploadType = ref<'folder' | 'archive'>('folder')

// 文件列表
const fileList = ref<UploadUserFile[]>([])
const archiveList = ref<UploadUserFile[]>([])
const selectedFile = ref<any>(null)

// 解压相关
const extracting = ref(false)
const extractPreviewVisible = ref(false)
const extractedFiles = ref<any[]>([])

// 解压配置
const extractConfig = reactive({
  preserveStructure: true,
  filterImages: true,
  maxSize: 100 // MB
})

// 上传进度
const uploadProgress = reactive({
  show: false,
  percentage: 0,
  completed: 0,
  total: 0,
  status: 'info' as 'info' | 'success' | 'warning' | 'exception',
  targetFolder: '',
  currentFile: '',
  extractionStatus: ''
})

const userStore = useUserStore()
const username = computed(() => userStore.user?.username || '')
const folderName = ref('')
const uploading = ref(false)

// 计算属性
const displayFileList = computed(() => {
  if (uploadType.value === 'folder') {
    return fileList.value
  } else {
    return extractedFiles.value
  }
})

const canUpload = computed(() => {
  if (uploadType.value === 'folder') {
    return fileList.value.length > 0
  } else {
    return archiveList.value.length > 0
  }
})

const previewFileList = computed(() => {
  return displayFileList.value
    .map(file => convertToPreviewFormat(file))
    .filter(file => file !== null)
})

// 文件验证
const beforeUpload = (rawFile: UploadRawFile) => {
  const maxSize = 10 * 1024 * 1024 // 10MB per image
  if (rawFile.size > maxSize) {
    ElMessage.error(`图片文件 ${rawFile.name} 大小不能超过 10MB`)
    return false
  }
  
  const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
  const fileExtension = rawFile.name.split('.').pop()?.toLowerCase()
  
  if (!fileExtension || !allowedTypes.includes(fileExtension)) {
    ElMessage.error(`不支持的图片格式: ${fileExtension}`)
    return false
  }
  
  return true
}

const beforeArchiveUpload = (rawFile: UploadRawFile) => {
  const maxSize = extractConfig.maxSize * 1024 * 1024
  if (rawFile.size > maxSize) {
    ElMessage.error(`压缩包大小不能超过 ${extractConfig.maxSize}MB`)
    return false
  }
  
  const allowedTypes = ['zip', 'rar', '7z']
  const fileExtension = rawFile.name.split('.').pop()?.toLowerCase()
  
  if (!fileExtension || !allowedTypes.includes(fileExtension)) {
    ElMessage.error(`不支持的压缩包格式: ${fileExtension}`)
    return false
  }
  
  return true
}

// 文件处理
const handleFolderChange: UploadProps['onChange'] = (uploadFile, uploadFiles) => {
  fileList.value = uploadFiles.filter(file => {
    if (file.raw) {
      const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
      const fileExtension = file.name?.split('.').pop()?.toLowerCase()
      return fileExtension && allowedTypes.includes(fileExtension)
    }
    return false
  })
  
  if (uploadFile.raw && fileList.value.includes(uploadFile)) {
    selectedFile.value = convertToPreviewFormat(uploadFile)
  }
}

const handleArchiveChange: UploadProps['onChange'] = async (uploadFile, uploadFiles) => {
  archiveList.value = uploadFiles
  
  if (uploadFile.raw) {
    await previewArchiveContents(uploadFile.raw)
  }
}

// 压缩包预览
const previewArchiveContents = async (file: File) => {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    ElMessage.warning('目前仅支持 .zip 格式的压缩包预览')
    return
  }
  
  try {
    extracting.value = true
    extractPreviewVisible.value = true
    extractedFiles.value = []
    
    const zip = new JSZip()
    const contents = await zip.loadAsync(file)
    
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
    const files: any[] = []
    
    for (const [path, zipEntry] of Object.entries(contents.files)) {
      if (!zipEntry.dir) {
        const extension = path.split('.').pop()?.toLowerCase()
        
        if (!extractConfig.filterImages || (extension && imageExtensions.includes(extension))) {
          const blob = await zipEntry.async('blob')
          files.push({
            name: zipEntry.name.split('/').pop(),
            path: zipEntry.name,
            size: blob.size,
            blob: blob,
            type: extension || 'unknown'
          })
        }
      }
    }
    
    extractedFiles.value = files
    
    if (files.length > 0) {
      selectedFile.value = convertToPreviewFormat(files[0])
    }
    
  } catch (error) {
    ElMessage.error('解析压缩包失败: ' + (error as Error).message)
    extractPreviewVisible.value = false
  } finally {
    extracting.value = false
  }
}

const handleCloseExtractPreview = () => {
  extractPreviewVisible.value = false
  extractedFiles.value = []
  selectedFile.value = null
}

const confirmExtract = () => {
  extractPreviewVisible.value = false
  ElMessage.success(`已解析 ${extractedFiles.value.length} 个文件，可以开始上传`)
}

// 文件操作
const clearFiles = () => {
  if (uploadType.value === 'folder') {
    fileList.value = []
  } else {
    archiveList.value = []
    extractedFiles.value = []
  }
  selectedFile.value = null
}

const handleSelectFile = (file: any) => {
  selectedFile.value = file
}

// 格式转换
const convertToPreviewFormat = (file: any) => {
  if (file.raw) {
    // 处理 UploadUserFile
    return {
      filename: file.name,
      type: getFileExtension(file.name),
      size: file.size || file.raw.size,
      path: file.url || URL.createObjectURL(file.raw),
      uid: file.uid
    }
  } else if (file.blob) {
    // 处理解压的文件
    return {
      filename: file.name,
      type: file.type,
      size: file.size,
      path: URL.createObjectURL(file.blob),
      uid: file.path
    }
  }
  return null
}

// 工具函数
const getFileExtension = (filename: string) => {
  return filename.split('.').pop()?.toLowerCase() || ''
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getUploadButtonText = () => {
  if (uploadType.value === 'folder') {
    return '上传文件夹'
  } else {
    return '上传并解压'
  }
}

// 上传处理
const submitUpload = async () => {
  if (!username.value) {
    ElMessage.error('请先登录')
    return
  }
  
  if (!canUpload.value) {
    ElMessage.warning('请先选择要上传的文件')
    return
  }
  
  try {
    uploading.value = true
    uploadProgress.show = true
    uploadProgress.percentage = 0
    uploadProgress.status = 'info'
    
    if (uploadType.value === 'folder') {
      await uploadFolder()
    } else {
      await uploadArchive()
    }
    
  } catch (error: any) {
    uploadProgress.status = 'exception'
    const msg = error?.response?.data?.detail || error?.message || '上传失败'
    ElMessage.error(msg)
  } finally {
    uploading.value = false
    setTimeout(() => {
      uploadProgress.show = false
    }, 3000)
  }
}

const uploadFolder = async () => {
  const form = new FormData()
  form.append('username', username.value)
  form.append('stage', 'images')
  form.append('upload_type', 'folder')
  
  if (folderName.value && folderName.value.trim()) {
    form.append('custom_folder_name', folderName.value.trim())
  }
  
  uploadProgress.total = fileList.value.length
  uploadProgress.completed = 0
  uploadProgress.extractionStatus = '准备上传文件夹...'
  
  for (const file of fileList.value) {
    if (file.raw) {
      form.append('files', file.raw, file.name)
    }
  }
  
  const res = await api.post('/upload/', form, {
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
  uploadProgress.targetFolder = res.data.folder_info.target_path
  
  ElMessage.success(`文件夹上传成功：保存至 ${res.data.folder_info.folder_name}`)
  clearFiles()
}

const uploadArchive = async () => {
  if (extractedFiles.value.length === 0) {
    ElMessage.error('没有可上传的文件')
    return
  }
  
  const form = new FormData()
  form.append('username', username.value)
  form.append('stage', 'images')
  form.append('upload_type', 'archive')
  
  if (folderName.value && folderName.value.trim()) {
    form.append('custom_folder_name', folderName.value.trim())
  }
  
  uploadProgress.total = extractedFiles.value.length
  uploadProgress.completed = 0
  uploadProgress.extractionStatus = '准备上传解压文件...'
  
  for (const file of extractedFiles.value) {
    if (file.blob) {
      const fileName = extractConfig.preserveStructure ? file.path : file.name
      form.append('files', file.blob, fileName)
    }
  }
  
  const res = await api.post('/upload/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        uploadProgress.percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      }
    }
  })
  
  uploadProgress.status = 'success'
  uploadProgress.percentage = 100
  uploadProgress.completed = extractedFiles.value.length
  uploadProgress.targetFolder = res.data.folder_info.target_path
  
  ElMessage.success(`压缩包解压上传成功：保存至 ${res.data.folder_info.folder_name}`)
  clearFiles()
}
</script>

<style scoped src="../../asset/upload/folderupload.css">
</style>