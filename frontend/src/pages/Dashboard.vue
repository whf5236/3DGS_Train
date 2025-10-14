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
                文档上传
              </el-menu-item>
              <el-menu-item index="1-4">
                <el-icon><Box /></el-icon>
                压缩文件上传
              </el-menu-item>
              <el-menu-item index="1-5">
                <el-icon><Connection /></el-icon>
                点云文件上传
              </el-menu-item>
              <el-menu-item index="1-6">
                <el-icon><Files /></el-icon>
                其他文件上传
              </el-menu-item>
            </el-menu-item-group>
          </el-sub-menu>
          <el-sub-menu index="2">
            <template #title>
              <span class="menu-title-content">
                <el-icon class="menu-icon"><Folder /></el-icon>
                <span class="menu-text">文件管理</span>
              </span>
            </template>
            <el-menu-item-group>
              <template #title>文件操作</template>
              <el-menu-item index="2-1">
                <el-icon><List /></el-icon>
                文件列表
              </el-menu-item>
              <el-menu-item index="2-2">
                <el-icon><Search /></el-icon>
                文件搜索
              </el-menu-item>
            </el-menu-item-group>
            <el-menu-item-group title="文件处理">
              <el-menu-item index="2-3">
                <el-icon><Operation /></el-icon>
                批量处理
              </el-menu-item>
            </el-menu-item-group>
          </el-sub-menu>
          <el-sub-menu index="3">
            <template #title>
              <span class="menu-title-content">
                <el-icon class="menu-icon"><Setting /></el-icon>
                <span class="menu-text">系统设置</span>
              </span>
            </template>
            <el-menu-item-group>
              <template #title>用户设置</template>
              <el-menu-item index="3-1">
                <el-icon><User /></el-icon>
                个人资料
              </el-menu-item>
              <el-menu-item index="3-2">
                <el-icon><Tools /></el-icon>
                偏好设置
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
  Operation, Setting, User, Tools, View, Warning, Box, Connection, Files
} from '@element-plus/icons-vue'
import ImageUpload from './FileUpload/ImageUpload.vue'
import VideoUpload from './FileUpload/VideoUpload.vue'
import FileList from './FileUpload/FileList.vue'

const activeIndex = ref('1-1')

// 获取当前页面标题
const getCurrentTitle = () => {
  const titleMap: Record<string, string> = {
    '1-1': '图片上传',
    '1-2': '视频上传', 
    '1-3': '文档上传',
    '1-4': '压缩文件上传',
    '1-5': '点云文件上传',
    '1-6': '其他文件上传',
    '2-1': '文件列表',
    '2-2': '文件搜索',
    '2-3': '批量处理',
    '3-1': '个人资料',
    '3-2': '偏好设置'
  }
  return titleMap[activeIndex.value] || '未知页面'
}

// 菜单选择事件处理
function onMenuSelect(index: string) {
  activeIndex.value = index
  // 切换菜单时清空预览状态
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
      case '1-4':
      case '1-5':
      case '1-6':
        return null // 其他文件类型上传组件待开发
      default:
        return null
    }
  }
  if (idx.startsWith('2-')) {
    switch (idx) {
      case '2-1':
        return markRaw(FileList)
      default:
        return null
    }
  }
  return null
})

// 主区域组件的最小 props 映射（尽量减少 Dashboard 的胶水逻辑）
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