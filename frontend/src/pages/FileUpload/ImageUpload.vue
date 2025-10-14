<template>
  <div class="image-upload">
    <!-- WebSocket状态指示器 -->
    <div class="websocket-status" v-if="showWebSocketStatus">
      <el-tag 
        class="websocket-tag"
        :type="isConnected ? 'success' : 'danger'" 
        size="large"
      >
        <el-icon>
          <Connection v-if="isConnected" />
          <Close v-else />
        </el-icon>
        {{ isConnected ? '已连接' : '未连接' }}
      </el-tag>
    </div>
    <!-- 上传区域 -->
    <div class="upload-area">
      <!-- 文件夹配置 -->
      <div class="folder-config">
        <el-form :model="uploadConfig" label-width="300px" size="large">
          <el-form-item label="文件夹名称:">
            <el-input
              v-model="uploadConfig.customFolderName"
              placeholder="输入自定义文件夹名称（可选）"
              clearable
              class="folder-input"
            >
              <template #prefix>
                <el-icon><Folder /></el-icon>
              </template>
            </el-input>
            <div class="folder-preview" v-if="uploadConfig.customFolderName">
              <span >文件将保存到: {{ uploadConfig.customFolderName }}/</span>
            </div>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 上传组件 -->
      <div class="upload-component">           
        <el-upload
          v-model:file-list="fileList"
          action="#"
          list-type="picture-card"
          :auto-upload="false"
          :on-remove="handleRemove"
          :on-preview="handlePictureCardPreview"
          :before-upload="beforeUpload"
          multiple
          accept="image/*"
          class="custom-upload"
        >
          <el-icon><Plus /></el-icon>
        </el-upload>
        <el-dialog v-model="dialogVisible">
          <img w-full :src="dialogImageUrl" alt="Preview Image" />
        </el-dialog>
      </div>
    </div>

    <div class="upload-actions">
      <el-button 
        type="primary" 
        @click="uploadFiles" 
        :loading="uploading"
        :disabled="fileList.length === 0 || !username"
        :icon="UploadFilled"
        size="large"
      >
        {{ uploading ? '上传中...' : `上传 ${fileList.length} 个文件` }}
      </el-button>
      <el-button @click="clearFiles" :disabled="fileList.length === 0" size="large">
        清空列表
      </el-button>
    </div>

    <!-- 上传进度显示 -->
    <div v-if="uploadProgress.show" class="upload-progress">
      <el-card shadow="never">
        <template #header>
          <div class="progress-header">
            <span>上传进度</span>
            <el-tag :type="uploadProgress.status === 'success' ? 'success' : 'info'">
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
            <strong>当前文件:</strong> {{ uploadProgress.currentFile }}
          </p>
        </div>
      </el-card>
    </div>

    <!-- 文件列表组件 -->
    <div class="file-list-section">
      <FileList 
        :selectedFile="selectedFile"
        :showPreview="false"
        @preview-file="handleSelectFile"
        @file-selected="handleSelectFile"
      />
    </div>
  </div>
</template>

<script setup lang="ts" name="ImageUpload">
import { UploadFilled, Plus, Connection, Close, Folder } from '@element-plus/icons-vue'
import { useImageUpload } from '@/composables/useUpload/useImageUpload'
import FileList from './FileList.vue'

// 使用封装的 composable
const {
  // 响应式数据
  fileList,
  selectedFile,
  uploading,
  showWebSocketStatus,
  dialogImageUrl,
  dialogVisible,
  uploadConfig,
  uploadProgress,
  // 计算属性
  username,
  isConnected,
  
  // 方法
  uploadFiles,
  handleRemove,
  handlePictureCardPreview,
  beforeUpload,
  clearFiles,
  handleSelectFile
} = useImageUpload()
</script>

<style scoped src="../../asset/upload/ImageUpload.css">
</style>

         
