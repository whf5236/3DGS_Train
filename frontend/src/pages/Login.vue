<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2 class="title">登录</h2>
      
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        class="mb-4"
      />

      <el-form 
        @submit.prevent="handleLogin"
        label-position="top"
        size="large"
      >
        <el-form-item label="用户名：">
          <el-input
            v-model="username"
            placeholder="请输入您的用户名"
            :prefix-icon="User"
            autocomplete="username"
          />
        </el-form-item>
        
        <el-form-item label="密码：">
          <el-input
            v-model="password"
            type="password"
            placeholder="请输入您的密码"
            :prefix-icon="Lock"
            autocomplete="current-password"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            class="submit-btn"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="register-link">
        没有账号？ <router-link to="/register">立即注册</router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts" name="LoginPage">
import { User, Lock } from '@element-plus/icons-vue'
import { useLogin } from '@/composables/useLogin'

const { username, password, error, loading, handleLogin } = useLogin()
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 40px;
  position: relative;
  overflow: hidden;

}


.login-card {
  width: 30%;
  padding: 20px;
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.15) !important;  /* 降低不透明度 */
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  border-radius: 24px !important;
}

:deep(.el-card__body) {
  padding: 30px;  /* 增加内部间距 */
}

.title {
  font-size: 100px;  /* 增大标题字号 */
  margin-bottom: 40px;
  color: #fff;  /* 改为白色 */
  font-weight: 600;
  text-align: center;
}

:deep(.el-form-item__label) {
  font-size: 58px;
  color: #fff;  /* 改为白色 */
  margin-bottom: 40px;
}

:deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.1);  /* 更透明的输入框 */
  border: 1px solid rgba(255, 255, 255, 0.2);
  height: 96px;  /* 增加输入框高度 */
}

:deep(.el-input__inner) {
  color: #fff;  /* 输入文字颜色改为白色 */
  font-size: 40px;

}

:deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.7);  /* 占位符文字颜色 */
}

.submit-btn {
  width: 100%;
  height: 96px;  /* 增加按钮高度 */
  font-size: 58px;
  margin-top: 30px;
  background: rgba(64, 158, 255, 0.8);  /* 半透明的按钮 */
  border: none;
}

.register-link {
  margin-top: 30px;
  font-size: 36px;
  text-align: center;
  color: #fff;
}

.register-link a {
  color: #409EFF;
  font-weight: 600;
}

/* 输入框获得焦点时的效果 */
:deep(.el-input__wrapper:hover),
:deep(.el-input__wrapper:focus-within) {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3);
}

/* 调整输入框前缀图标大小 */
:deep(.el-input__prefix .el-icon) {
  font-size: 50px; /* 控制大小 */
  color: #fff; /* 改颜色 */
}

</style>