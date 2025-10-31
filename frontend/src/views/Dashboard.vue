<template>
<div class="dashboard">
  <el-container class="layout-container">
    <el-aside class="dashboard-aside">
      <div class="dashboard-container-aside">
      <el-scrollbar>
        <el-menu :default-openeds="['1']" :default-active="activeIndex" @select="onMenuSelect">
          <el-sub-menu index="1">
            <template #title>
              <span class="menu-title-content">
                <el-icon class="menu-icon"><Upload /></el-icon>
                <span class="menu-text">文件上传</span>
              </span>
            </template>
            <el-menu-item-group>
              <el-menu-item index="1-1">
                <el-icon><Picture /></el-icon>
                图片上传
              </el-menu-item>
              <el-menu-item index="1-2">
                <el-icon><VideoPlay /></el-icon>
                视频上传
              </el-menu-item>
              <el-menu-item index="1-3">
                <el-icon><Document /></el-icon>
                图片文件夹上传|压缩文件上传
              </el-menu-item>
              <el-menu-item index="1-4">
                <el-icon><Box /></el-icon>
                点云文件上传
              </el-menu-item>
            </el-menu-item-group>
          </el-sub-menu>
          <el-sub-menu index="2">
            <template #title>
              <span class="menu-title-content">
                <el-icon class="menu-icon"><Folder /></el-icon>
                <span class="menu-text">训练管理</span>
              </span>
            </template>
            <el-menu-item-group>
              
              <el-menu-item index="2-1">
                <el-icon><List /></el-icon>
                点云处理
              </el-menu-item>
              <el-menu-item index="2-2">
                <el-icon><Search /></el-icon>
                训练处理
              </el-menu-item>
            </el-menu-item-group>
          </el-sub-menu>
          <el-sub-menu index="3">
            <template #title>
              <span class="menu-title-content">
                <el-icon class="menu-icon"><Setting /></el-icon>
                <span class="menu-text">控制管理</span>
              </span>
            </template>
          
            <el-menu-item-group>
              <el-menu-item index="3-1">
                <el-icon><Setting /></el-icon>
                训练控制
              </el-menu-item>
              <el-menu-item index="3-2">
                <el-icon><Edit /></el-icon>
                点云编辑
              </el-menu-item>
            </el-menu-item-group>
          </el-sub-menu>
        </el-menu>
      </el-scrollbar>
      </div>
    </el-aside>

    <el-main class="dashboard-main">
      <div class="dashboard-container-main">
        <transition name="el-zoom-in-center" mode="out-in">
          <component
            v-if="mainComponent"
            :is="mainComponent"
            v-bind="mainProps"
          />
        </transition>
      </div>
    </el-main>
  </el-container>
</div>
</template>

<script setup lang="ts" name="Dashboard">
import { ref, computed, markRaw } from 'vue'
import { 
  Upload, Picture, VideoPlay, Document, Folder, List, Search, 
   Setting, Box, Edit } from '@element-plus/icons-vue'
import { ElContainer, ElAside, ElMain, ElMenu, ElMenuItem, 
  ElMenuItemGroup,ElIcon, ElSubMenu, ElScrollbar,  } from 'element-plus'
import ImageUpload from './FileUpload/ImageUpload.vue'
import VideoUpload from './FileUpload/VideoUpload.vue'
import FolderUpload from './FileUpload/FolderUpload.vue'
import SplatUpload from './FileUpload/SplatUpload.vue'
import PointCloudProcessor from './Progress/PointCloudProcessor.vue'
import TrainingComponent from './Progress/TrainingComponent.vue'
import SplatEditorWrapper from './SplatEditor/SplatEditorWrapper.vue'
import TrainControlView from './TrainControl/TrainControlView.vue'

const activeIndex = ref('1-1')

// 菜单选择事件处理
function onMenuSelect(index: string) {
  activeIndex.value = index
}


// 根据菜单索引，决定主区域挂载的组件（组件内部自带自己的预览/列表等内容）
const mainComponent = computed(() => {
  const idx = activeIndex.value
  if (idx.startsWith('1-')) {
    switch (idx) {
      case '1-1':
        return markRaw(ImageUpload)
      case '1-2':
        return markRaw(VideoUpload)
      case '1-3':
        return markRaw(FolderUpload)
      case '1-4':
        return markRaw(SplatUpload)
      default:
        return null
    }
  }
  if (idx.startsWith('2-')) {
    switch (idx) {
      case '2-1':
        return markRaw(PointCloudProcessor)
      case '2-2':
        return markRaw(TrainingComponent)
      default:
        return null
    }
  }
  if (idx.startsWith('3-')) {
    switch (idx) {
      case '3-1':
        return markRaw(TrainControlView)
      case '3-2':
        return markRaw(SplatEditorWrapper)
      default:
        return null
    }
  }
  return null
})

const mainProps = computed(() => {
  const idx = activeIndex.value
  switch (idx) {
    case '2-1':
      return { showPreview: false }
    default:
      return {}
  }
})
</script>

<style scoped lang="css" src="../asset/Dashboard.css">
</style>