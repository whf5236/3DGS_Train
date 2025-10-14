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

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
}
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(25, 25, 35, 0.45);  /* 从 0.85 改为 0.65 */
  /* 可以添加一个微妙的渐变效果 */
  background: linear-gradient(
    to bottom,
    rgba(25, 25, 35, 0.75),
    rgba(25, 25, 35, 0.55)
  );
  color: white;
  padding: 0 2rem;
  height: 200px; /* 增加导航栏高度 */
  backdrop-filter: blur(8px); /* 增强模糊效果 */
  /* 添加一个微妙的光晕效果 */
  box-shadow: 0 1px 12px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-left .logo {
  display: flex;
  align-items: center;
  color: white;
  text-decoration: none;
  font-size: 4em; /* 增加logo整体大小 */
}

.logo-text {
  margin-left: 12px; /* 增加间距 */
  font-weight: 600;
  font-size: 50px; /* 稍微增大字体 */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px; /* 添加按钮之间的间距 */
}

/* 调整未登录状态下的按钮大小 */
.header-right :deep(.el-button) {
  font-size: 16px;
  padding: 12px 24px;
}

/* 调整已登录状态下的菜单项 */
.menu {
  background: transparent;
  color: white;
  border: none;
  font-size: 16px; /* 增加菜单字体大小 */
}

:deep(.el-menu--horizontal > .el-menu-item),
:deep(.el-menu--horizontal > .el-sub-menu .el-sub-menu__title) {
  height: 70px; /* 匹配header高度 */
  line-height: 70px;
  padding: 0 20px;
}

.user-avatar {
  background-color: rgba(255, 255, 255, 0.2);
  font-weight: bold;
  color: white;
  width: 40px !important; /* 增加头像大小 */
  height: 40px !important;
  font-size: 18px !important;
}

.username {
  margin-left: 8px;
  font-size: 16px; /* 增加用户名字体大小 */
}

/* 调整下拉菜单样式 */
:deep(.el-menu--popup) {
  font-size: 16px; /* 增加下拉菜单字体大小 */
}

:deep(.el-menu--popup .el-menu-item) {
  height: 50px; /* 增加下拉菜单项高度 */
  line-height: 50px;
  padding: 0 24px;
}

.main-content {
  flex: 1;
  padding: 2rem; /* 增加主内容区域内边距 */
}
</style>
