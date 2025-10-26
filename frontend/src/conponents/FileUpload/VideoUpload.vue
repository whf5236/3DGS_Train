<template>
  <div class="video-upload-container">
    <el-row :gutter="24">
      <!-- 左侧：上传区域 -->
      <el-col :span="12">
        <!-- 帧率提取配置 -->
        <el-card class="frame-extraction" shadow="hover">
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
              @click="() => { const previewFile = convertToPreviewFormat(file); if (previewFile) handleSelectFile(previewFile); }"
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
        <el-card class="folder-reset" shadow="hover">
          <template #header>
            <span class="config-title">
              <el-icon><Folder /></el-icon> 文件夹配置
            </span>
          </template>
          
          <el-input
            v-model="folderName"
            placeholder="输入自定义文件夹名称（可选）"
            clearable
            class="folder-input"
            :prefix-icon="Folder"
          />
        </el-card>

        <!-- 上传按钮 -->
        <div class="upload-actions">
          <el-button
            type="primary"
            size="large"
            @click="uploadFiles"
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
        :status="uploadProgress.status === 'success' ? 'success' : uploadProgress.status === 'exception' ? 'exception' : undefined"
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
import { onMounted } from 'vue'
import { UploadFilled, Delete, VideoPlay,
  Upload, Setting, Folder
} from '@element-plus/icons-vue'

import { ElCard, ElInput, ElButton, ElTag, 
  ElProgress,ElRow,ElCol,
  ElIcon,ElUpload } from 'element-plus'
import FilePreview from './FilePreview.vue'
import { FileUpload } from '@/composables/useUpload/fileUpload'

// 使用 composable
const {
  fileList,
  selectedFile,
  frameRate,
  extractAllFrames,
  folderName,
  uploading,
  uploadProgress,
  previewFileList,
  uploadFiles,
  removeFile,
  beforeUpload,
  handleFileChange,
  clearFiles,
  convertToPreviewFormat,
  handleSelectFile,
  getFileExtension,
  formatFileSize,
  setStage,
} = FileUpload()

// 设置当前组件类型
onMounted(() => {
  setStage('images')
})
</script>

<style scoped src="../../asset/upload/videoUpload.css">
</style>
