<template>
  <div class="app-layout">
    <!-- ✅ 顶部导航栏 -->
    <header class="header-bar">
      <div class="header-left">
        <router-link to="/" class="logo">
          <el-icon><Grid /></el-icon>
          <span class="logo-text">3D高斯泼溅全流程训练监控平台</span>
        </router-link>
      </div>

      <div class="header-right">
        <template v-if="!isLogin">
          <el-button text @click="router.push('/login')">登录</el-button>
          <el-button type="primary" @click="router.push('/register')">注册</el-button>
        </template>

        <!-- 已登录 -->
        <template v-else>
          <el-menu mode="horizontal" class="menu" :ellipsis="false">
            <el-menu-item index="dashboard" @click="router.push('/dashboard')">
              主页面
            </el-menu-item>

            <el-sub-menu index="user">
              <template #title>
                <el-avatar :size="32" class="user-avatar">
                  {{ userInitial }}
                </el-avatar>
                <span class="username">{{ username }}</span>
              </template>
              <el-menu-item @click="router.push('/profile')">
                <el-icon><User /></el-icon>
                个人信息
              </el-menu-item>
              <el-menu-item @click="router.push('/dashboard')">
                <el-icon><Monitor /></el-icon>
                主页面
              </el-menu-item>
              <el-menu-item divided @click="logout">
                <el-icon><SwitchButton /></el-icon>
                登出
              </el-menu-item>
            </el-sub-menu>
          </el-menu>
        </template>
      </div>
    </header>
    <!-- ✅ 页面主体 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts" name="AppLayout">
import { computed } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useRouter } from 'vue-router'
import { Grid, User, Monitor, SwitchButton } from '@element-plus/icons-vue'
import { ElAvatar, ElMenu, ElMenuItem,ElButton,  ElSubMenu,ElIcon } from 'element-plus'
const userStore = useUserStore()
const router = useRouter()

const isLogin = computed(() => userStore.isAuthenticated)
const username = computed(() => userStore.user?.username || 'User')
const userInitial = computed(() => username.value.charAt(0).toUpperCase())

const logout = () => {
  userStore.logout()
  router.push('/login')
}
</script>


<style scoped src="./AppLayout.css">
</style>