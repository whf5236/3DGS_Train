<template>
  <div class="splat-upload-container">
    <el-row :gutter="24">
      <!-- 左侧：上传区域 -->
      <el-col :span="12">
        <!-- 点云类型配置 -->
        <el-card class="pointcloud-type-config" shadow="hover">
          <template #header>
            <span class="config-title">
              <el-icon><Setting /></el-icon> 点云类型配置
            </span>
          </template>
          
          <div class="config-content">
            <el-radio-group v-model="pointcloudType" class="pointcloud-type-group">
              <el-radio label="gaussian" size="large">
                <el-icon><Cpu /></el-icon> 高斯泼溅 (.splat)
              </el-radio>
              <el-radio label="standard" size="large">
                <el-icon><Box /></el-icon> 标准点云 (.ply/.pcd/.xyz)
              </el-radio>
              <el-radio label="lidar" size="large">
                <el-icon><Radar /></el-icon> 激光雷达 (.las/.laz)
              </el-radio>
              <el-radio label="mesh" size="large">
                <el-icon><Grid /></el-icon> 网格模型 (.obj)
              </el-radio>
              <el-radio label="colmap" size="large">
                <el-icon><FolderOpened /></el-icon> COLMAP 文件夹
              </el-radio>
            </el-radio-group>
            
            <div class="type-description">
              <p v-if="pointcloudType === 'gaussian'">
                3D Gaussian Splatting 训练后的点云文件，包含高斯参数信息
              </p>
              <p v-else-if="pointcloudType === 'standard'">
                标准点云格式，包含点的位置、颜色和法向量信息
              </p>
              <p v-else-if="pointcloudType === 'lidar'">
                激光雷达扫描数据，通常包含大量密集点云信息
              </p>
              <p v-else-if="pointcloudType === 'colmap'">
                COLMAP 重建结果文件夹，包含相机参数、稀疏点云和图像数据
              </p>
              <p v-else>
                3D网格模型文件，包含顶点、面和纹理信息
              </p>
            </div>
          </div>
        </el-card>

        <!-- 点云上传区域 -->
        <el-card class="upload-area" shadow="hover">
          <template #header>
            <span class="upload-title">
              <el-icon><Upload /></el-icon> 点云文件上传
            </span>
          </template>
          
          <el-upload
            ref="pointcloudUploadRef"
            v-model:file-list="fileList"
            class="upload-dragger"
            drag
            :auto-upload="false"
            multiple
            :accept="acceptedFormats"
            :directory="pointcloudType === 'colmap'"
            :on-change="handleFileChange"
            :before-upload="beforeUpload"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              {{ pointcloudType === 'colmap' ? '将 COLMAP 文件夹拖到此处，或点击选择文件夹' : '将点云文件拖到此处，或点击上传' }}
            </div>
            <template #tip>
              <div class="el-upload__tip">
                {{ pointcloudType === 'colmap' ? '支持 COLMAP 重建结果文件夹（包含 cameras.txt, images.txt, points3D.txt 等文件）' : `支持 ${getFormatDescription()}，单个文件不超过 ${maxFileSize}MB` }}
              </div>
            </template>
          </el-upload>
        </el-card>

        <!-- 文件列表 -->
        <el-card v-if="fileList.length" class="file-list-card" shadow="hover">
          <template #header>
            <div class="file-list-header">
              <span>点云文件列表 ({{ fileList.length }})</span>
              <el-button size="small" @click="clearFiles" :icon="Delete">清空</el-button>
            </div>
          </template>
          
          <div class="file-list">
            <div
              v-for="file in fileList"
              :key="file.uid"
              :class="['file-item', { selected: selectedFile?.uid === file.uid }]"
              @click="handleSelectFile(file)"
            >
              <div class="file-content">
                <div class="file-icon">
                  <el-icon>
                    <component :is="getFileIcon(file.name)" />
                  </el-icon>
                </div>
                <div class="file-info">
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-details">
                    <span class="file-type">{{ getFileExtension(file.name).toUpperCase() }}</span>
                    <span class="file-size">{{ formatFileSize(file.size || file.raw?.size || 0) }}</span>
                    <span class="file-format">{{ getPointcloudFormat(file.name) }}</span>
                  </div>
                  <div class="file-stats" v-if="fileStats[file.uid || 0]">
                    <span class="stat-item">
                      <el-icon><DataAnalysis /></el-icon>
                      {{ fileStats[file.uid || 0]?.estimatedPoints }} 点
                    </span>
                  </div>
                </div>
              </div>
              <div class="file-actions">
                <el-button size="small" type="primary" @click.stop="handlePreviewFile(file)">
                  <el-icon><View /></el-icon>
                </el-button>
                <el-button size="small" type="danger" @click.stop="removeFile(file)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 上传配置 -->
        <el-card class="upload-config" shadow="hover">
          <template #header>
            <span class="config-title">
              <el-icon><Tools /></el-icon> 上传配置
            </span>
          </template>
          
          <div class="config-content">
            <div class="config-item">
              <label class="config-label">处理模式:</label>
              <el-radio-group v-model="uploadConfig.processMode" class="process-mode-group">
                <el-radio label="direct">直接存储</el-radio>
                <el-radio label="optimize">优化处理</el-radio>
                <el-radio label="convert">格式转换</el-radio>
              </el-radio-group>
            </div>
            
            <div class="config-item" v-if="uploadConfig.processMode === 'optimize'">
              <label class="config-label">优化选项:</label>
              <div class="optimize-options">
                <el-checkbox v-model="uploadConfig.removeOutliers">移除离群点</el-checkbox>
                <el-checkbox v-model="uploadConfig.downsample">降采样</el-checkbox>
                <el-checkbox v-model="uploadConfig.normalEstimation">法向量估计</el-checkbox>
              </div>
            </div>
            
            <div class="config-item" v-if="uploadConfig.processMode === 'convert'">
              <label class="config-label">目标格式:</label>
              <el-select v-model="uploadConfig.targetFormat" placeholder="选择目标格式">
                <el-option label="PLY" value="ply" />
                <el-option label="PCD" value="pcd" />
                <el-option label="XYZ" value="xyz" />
                <el-option label="OBJ" value="obj" />
              </el-select>
            </div>
            
            <div class="config-item">
              <label class="config-label">质量设置:</label>
              <el-slider
                v-model="uploadConfig.quality"
                :min="1"
                :max="10"
                :step="1"
                show-input
                class="quality-slider"
              />
              <div class="quality-description">
                {{ getQualityDescription() }}
              </div>
            </div>
          </div>
        </el-card>

        <!-- 自定义文件夹名称 -->
        <el-card class="folder-config" shadow="hover">
          <template #header>
            <span class="config-title">
              <el-icon><Folder /></el-icon> 存储配置
            </span>
          </template>
          
          <el-input
            v-model="folderName"
            placeholder="输入自定义文件夹名称（可选）"
            clearable
            :prefix-icon="Folder"
          />
          <div class="folder-hint">
            默认存储路径: /{{ username }}/pointcloud/{{ folderName || '自动生成' }}
          </div>
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
            <el-icon><CloudUpload /></el-icon>
            {{ uploading ? '上传中...' : '上传点云文件' }}
          </el-button>
        </div>
      </el-col>

      <!-- 右侧：文件预览区域 -->
      <el-col :span="12">
        <PointcloudPreview
          :selected-file="selectedFile"
          :file-list="previewFileList"
          :pointcloud-type="pointcloudType"
          @select-file="handleSelectFile"
        />
      </el-col>
    </el-row>

    <!-- 上传进度显示 -->
    <el-card v-if="uploadProgress.show" class="progress-card" shadow="hover">
      <template #header>
        <div class="progress-header">
          <span>上传进度</span>
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
        <p v-if="uploadProgress.processStatus">
          <strong>处理状态:</strong> {{ uploadProgress.processStatus }}
        </p>
      </div>
    </el-card>

    <!-- 文件预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      :title="`点云文件预览 - ${previewFile?.name}`"
      width="80%"
      :before-close="handleClosePreview"
    >
      <div v-if="loadingPreview" class="preview-loading">
        <el-skeleton animated :rows="5" />
        <div class="loading-text">正在加载点云数据...</div>
      </div>
      
      <div v-else-if="previewData" class="preview-content">
        <div class="preview-info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="文件名">{{ previewFile?.name }}</el-descriptions-item>
            <el-descriptions-item label="文件大小">{{ formatFileSize(previewFile?.size || 0) }}</el-descriptions-item>
            <el-descriptions-item label="点云格式">{{ getPointcloudFormat(previewFile?.name || '') }}</el-descriptions-item>
            <el-descriptions-item label="估计点数">{{ previewData.pointCount }}</el-descriptions-item>
            <el-descriptions-item label="边界框">{{ previewData.boundingBox }}</el-descriptions-item>
            <el-descriptions-item label="颜色信息">{{ previewData.hasColor ? '是' : '否' }}</el-descriptions-item>
          </el-descriptions>
        </div>
        
        <div class="preview-visualization">
          <div class="preview-placeholder">
            <el-icon><View /></el-icon>
            <p>3D 可视化预览</p>
            <p class="preview-note">（实际项目中可集成 Three.js 或其他 3D 渲染库）</p>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="previewDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="addToUploadList">添加到上传列表</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="SplatUpload">
import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import {
  UploadFilled,
  Delete,
  Upload,
  Setting,
  Folder,
  FolderOpened,
  Tools,
  View,
  Upload as CloudUpload,
  Cpu,
  Box,
  Monitor as Radar,
  Grid,
  DataAnalysis,
} from '@element-plus/icons-vue'
import type { UploadProps, UploadUserFile, UploadRawFile } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import { api } from '@/api'
import PointcloudPreview from './PointcloudPreview.vue'

// 点云类型
const pointcloudType = ref<'gaussian' | 'standard' | 'lidar' | 'mesh' | 'colmap'>('gaussian')

// 文件列表和选中文件
const fileList = ref<UploadUserFile[]>([])
const selectedFile = ref<any>(null)
const fileStats = ref<Record<string, any>>({})

// 预览相关
const previewDialogVisible = ref(false)
const previewFile = ref<UploadUserFile | null>(null)
const previewData = ref<any>(null)
const loadingPreview = ref(false)

// 上传配置
const uploadConfig = reactive({
  processMode: 'direct' as 'direct' | 'optimize' | 'convert',
  removeOutliers: false,
  downsample: false,
  normalEstimation: false,
  targetFormat: 'ply',
  quality: 5
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
  processStatus: ''
})

const userStore = useUserStore()
const username = computed(() => userStore.user?.username || '')
const folderName = ref('')
const uploading = ref(false)
const maxFileSize = 500 // MB

// 计算属性
const acceptedFormats = computed(() => {
  const formats = {
    gaussian: '.splat',
    standard: '.ply,.pcd,.xyz,.pts',
    lidar: '.las,.laz',
    mesh: '.obj',
    colmap: '.txt,.bin,.jpg,.jpeg,.png'
  }
  return formats[pointcloudType.value]
})

const canUpload = computed(() => {
  return fileList.value.length > 0 && !uploading.value
})

const previewFileList = computed(() => {
  return fileList.value
    .map(file => convertToPreviewFormat(file))
    .filter(file => file !== null)
})

// 文件格式相关
const getFormatDescription = () => {
  const descriptions = {
    gaussian: 'SPLAT 格式',
    standard: 'PLY/PCD/XYZ/PTS 格式',
    lidar: 'LAS/LAZ 格式',
    mesh: 'OBJ 格式',
    colmap: 'COLMAP 文件夹'
  }
  return descriptions[pointcloudType.value]
}

const getFileIcon = (filename: string) => {
  const ext = getFileExtension(filename)
  const iconMap: Record<string, any> = {
    splat: Cpu,
    ply: Box,
    pcd: Box,
    xyz: Box,
    pts: Box,
    las: Radar,
    laz: Radar,
    obj: Grid,
    txt: FolderOpened,
    bin: FolderOpened,
    jpg: FolderOpened,
    jpeg: FolderOpened,
    png: FolderOpened
  }
  return iconMap[ext] || Box
}

const getPointcloudFormat = (filename: string) => {
  const ext = getFileExtension(filename)
  const formatMap: Record<string, string> = {
    splat: '高斯泼溅',
    ply: '多边形文件',
    pcd: '点云数据',
    xyz: '坐标点云',
    pts: '点集文件',
    las: '激光扫描',
    laz: '压缩激光',
    obj: '网格模型',
    txt: 'COLMAP 数据',
    bin: 'COLMAP 二进制',
    jpg: 'COLMAP 图像',
    jpeg: 'COLMAP 图像',
    png: 'COLMAP 图像'
  }
  return formatMap[ext] || '未知格式'
}

const getQualityDescription = () => {
  const descriptions = [
    '', '最低质量（快速处理）', '低质量', '较低质量', '中等偏低', '中等质量',
    '中等偏高', '较高质量', '高质量', '很高质量', '最高质量（精细处理）'
  ]
  return descriptions[uploadConfig.quality] || ''
}

// 文件验证
const beforeUpload = (rawFile: UploadRawFile) => {
  const maxSize = maxFileSize * 1024 * 1024
  if (rawFile.size > maxSize) {
    ElMessage.error(`文件 ${rawFile.name} 大小不能超过 ${maxFileSize}MB`)
    return false
  }
  
  const allowedExtensions = acceptedFormats.value.split(',').map(ext => ext.replace('.', ''))
  const fileExtension = rawFile.name.split('.').pop()?.toLowerCase()
  
  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    ElMessage.error(`不支持的文件格式: ${fileExtension}`)
    return false
  }
  
  return true
}

// 文件处理
const handleFileChange: UploadProps['onChange'] = async (uploadFile, uploadFiles) => {
  fileList.value = uploadFiles
  
  if (uploadFile.raw) {
    // 分析文件统计信息
    await analyzeFile(uploadFile)
    
    // 自动选中新上传的文件
    selectedFile.value = convertToPreviewFormat(uploadFile)
  }
}

const analyzeFile = async (file: UploadUserFile) => {
  try {
    // 模拟文件分析（实际项目中可以读取文件头信息）
    const size = file.size || file.raw?.size || 0
    const estimatedPoints = Math.floor(size / 20) // 粗略估算点数
    const uid = file.uid || 0
    
    fileStats.value[uid] = {
      estimatedPoints: formatNumber(estimatedPoints),
      hasColor: Math.random() > 0.5, // 模拟颜色信息检测
      hasNormals: Math.random() > 0.3 // 模拟法向量检测
    }
  } catch (error) {
    console.error('文件分析失败:', error)
  }
}

// 文件操作
const clearFiles = () => {
  fileList.value = []
  selectedFile.value = null
  fileStats.value = {}
}

const removeFile = (file: UploadUserFile) => {
  const index = fileList.value.findIndex(f => f.uid === file.uid)
  if (index > -1) {
    fileList.value.splice(index, 1)
    const uid = file.uid || 0
    delete fileStats.value[uid]
    
    if (selectedFile.value?.uid === file.uid) {
      selectedFile.value = fileList.value.length > 0 ? convertToPreviewFormat(fileList.value[0] as any) : null
    }
  }
}

const handleSelectFile = (file: any) => {
  selectedFile.value = file
}

// 文件预览
const handlePreviewFile = async (file: UploadUserFile) => {
  previewFile.value = file
  previewDialogVisible.value = true
  loadingPreview.value = true
  
  try {
    // 模拟加载点云数据
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    previewData.value = {
      pointCount: formatNumber(Math.floor((file.size || 0) / 20)),
      boundingBox: '[-10.5, -8.2, -2.1] ~ [12.3, 9.8, 15.6]',
      hasColor: fileStats.value[file.uid || 0]?.hasColor || false,
      hasNormals: fileStats.value[file.uid || 0]?.hasNormals || false
    }
  } catch (error) {
    ElMessage.error('预览加载失败')
  } finally {
    loadingPreview.value = false
  }
}

const handleClosePreview = () => {
  previewDialogVisible.value = false
  previewFile.value = null
  previewData.value = null
}

const addToUploadList = () => {
  if (previewFile.value && !fileList.value.find(f => f.uid === previewFile.value?.uid)) {
    fileList.value.push(previewFile.value as UploadUserFile)
  }
  handleClosePreview()
}

// 格式转换
const convertToPreviewFormat = (file: UploadUserFile) => {
  if (!file.raw) return null
  
  return {
    filename: file.name,
    type: getFileExtension(file.name),
    size: file.size || file.raw?.size || 0,
    path: file.url || (file.raw ? URL.createObjectURL(file.raw) : ''),
    uid: file.uid,
    format: getPointcloudFormat(file.name),
    stats: fileStats.value[file.uid || 0]
  }
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

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// 上传处理
const submitUpload = async () => {
  if (!username.value) {
    ElMessage.error('请先登录')
    return
  }
  
  if (!canUpload.value) {
    ElMessage.warning('请先选择要上传的点云文件')
    return
  }
  
  try {
    uploading.value = true
    uploadProgress.show = true
    uploadProgress.percentage = 0
    uploadProgress.status = 'info'
    uploadProgress.total = fileList.value.length
    uploadProgress.completed = 0
    
    const form = new FormData()
    form.append('username', username.value)
    form.append('upload_component', 'pointcloud')
    
    if (folderName.value && folderName.value.trim()) {
      form.append('custom_folder_name', folderName.value.trim())
    }
    
    // 添加配置信息
    form.append('pointcloud_type', pointcloudType.value)
    form.append('process_mode', uploadConfig.processMode)
    form.append('quality', uploadConfig.quality.toString())
    
    if (uploadConfig.processMode === 'optimize') {
      form.append('remove_outliers', uploadConfig.removeOutliers.toString())
      form.append('downsample', uploadConfig.downsample.toString())
      form.append('normal_estimation', uploadConfig.normalEstimation.toString())
    }
    
    if (uploadConfig.processMode === 'convert') {
      form.append('target_format', uploadConfig.targetFormat)
    }
    
    uploadProgress.processStatus = '准备上传点云文件...'
    
    for (const file of fileList.value) {
      if (file.raw) {
        form.append('files', file.raw, file.name)
      }
    }
    
    const res = await api.post('/upload_images', form, {
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
    uploadProgress.targetFolder = res.data.folder_structure.full_path
    uploadProgress.processStatus = '点云文件上传完成'
    
    ElMessage.success(`点云文件上传成功：保存至 ${res.data.folder_structure.folder_name}`)
    clearFiles()
    
  } catch (error: any) {
    uploadProgress.status = 'exception'
    uploadProgress.processStatus = '上传失败'
    const msg = error?.response?.data?.detail || error?.message || '上传失败'
    ElMessage.error(msg)
  } finally {
    uploading.value = false
    setTimeout(() => {
      uploadProgress.show = false
    }, 3000)
  }
}
</script>

<style scoped src="../../asset/upload/splatupload.css">
</style>