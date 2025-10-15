<template>
  <div class="home-container">
    <!-- Hero Section -->
    <el-row justify="center" class="hero-section">
      <el-col :xs="24" :sm="20" :md="16" :lg="12">
        <div class="hero-content">
          <h1 class="hero-title">
            <el-icon class="title-icon" size="48" color="#409EFF">
              <VideoCamera />
            </el-icon>
            3D高斯泼溅全流程训练监控平台
          </h1>
          <p class="hero-description">
            一个专业的3D模型训练与监控平台，助力您的项目成功
          </p>
          
          <div class="action-buttons">
            <el-button 
              v-if="!isAuthenticated" 
              type="primary" 
              size="large"
              @click="router.push('/login')"
              :icon="User"
            >
              立即登录
            </el-button>
            <el-button 
              v-if="isAuthenticated" 
              type="success" 
              size="large"
              @click="router.push('/dashboard')"
              :icon="Monitor"
            >
              进入系统
            </el-button>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- Features Section -->
    <el-row :gutter="24" class="features-section" justify="center">
      <el-col :xs="24" :sm="12" :md="6" v-for="feature in features" :key="feature.title">
        <el-card class="feature-card" shadow="hover">
          <template #header>
            <div class="feature-header">
              <el-icon class="feature-icon" size="32" :color="feature.color">
                <component :is="feature.icon" />
              </el-icon>
              <h3 class="feature-title">{{ feature.title }}</h3>
            </div>
          </template>
          <p class="feature-description">{{ feature.description }}</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts" name="Home">
import { useAuthStatus } from '@/composables/useAuthStatus'
import { useRouter } from 'vue-router'
import { 
  VideoCamera, 
  User, 
  Monitor, 
  Folder, 
  DataAnalysis, 
  Setting, 
  TrendCharts 
} from '@element-plus/icons-vue'

const { isAuthenticated } = useAuthStatus()
const router = useRouter()

// 功能特性数据
const features = [
  {
    title: '文件管理',
    description: '简单高效的文件上传与管理系统，支持多种文件格式',
    icon: Folder,
    color: '#409EFF'
  },
  {
    title: '点云处理',
    description: '强大的点云数据处理功能，提高模型训练效率',
    icon: DataAnalysis,
    color: '#67C23A'
  },
  {
    title: '模型训练',
    description: '多种训练选项，满足各类项目需求',
    icon: Setting,
    color: '#E6A23C'
  },
  {
    title: '实时监控',
    description: '训练过程实时可视化，监控模型进展',
    icon: TrendCharts,
    color: '#F56C6C'
  }
]
</script>

<style scoped src="../asset/Home.css">

</style>
