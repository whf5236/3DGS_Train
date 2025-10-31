<template>
  <div class="image-upload">
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
            <div class="folder-preview" v-show="uploadConfig.customFolderName">
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
          :on-remove="removeFile"
          :on-preview="handlePictureCardPreview"
          :before-upload="beforeUpload"
          multiple
          accept="image/*"
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
import { UploadFilled, Plus, Folder } from '@element-plus/icons-vue'
import { ElForm, ElFormItem, ElInput, ElButton, 
  ElDialog, ElIcon, ElUpload,  } from 'element-plus'
import FileList from './FileList.vue'
import { FileUpload } from '../../composables/useUpload/fileUpload'
import { onMounted } from 'vue'
const {
  // 响应式数据
  fileList,
  selectedFile,
  uploading,
  uploadConfig,
  dialogVisible,
  dialogImageUrl,
  // 计算属性
  username,
  // 方法
  uploadFiles,
  removeFile,
  beforeUpload,
  clearFiles,
  handleSelectFile,
  handlePictureCardPreview,
  setStage,
} = FileUpload()

// 设置当前组件类型
onMounted(() => {
  setStage('images')
})



</script>

<style scoped src="../../asset/upload/ImageUpload.css">
</style>

         
