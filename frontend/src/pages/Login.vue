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
import { ElForm,ElButton,ElInput,ElCard,ElAlert,ElFormItem } from 'element-plus'

const { username, password, error, loading, handleLogin } = useLogin()
</script>


<style scoped src="../asset/login.css"> 


</style>