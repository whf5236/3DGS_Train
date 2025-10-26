<template>
  <div class="register-container">
    <el-row justify="center">
      <el-col :xs="22" :sm="16" :md="12" :lg="8" :xl="6">
        <el-card shadow="always" class="register-card">
          <template #header>
            <div class="card-header">
              <h2>注册</h2>
            </div>
          </template>

          <el-alert
            v-if="error"
            :title="error"
            type="error"
            :closable="false"
            class="mb-4"
          />

          <el-alert
            v-if="success"
            :title="success"
            type="success"
            :closable="false"
            class="mb-4"
          />

          <el-form @submit.prevent="register" label-position="top" size="large">
            <el-form-item label="邮箱" :error="email && !isValidEmail ? '请输入有效的邮箱地址' : ''">
              <el-input
                v-model="email"
                type="email"
                placeholder="请输入您的邮箱 (例: user@example.com)"
                autocomplete="email"
                required
                :prefix-icon="Message"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="用户名" :error="username.length > 50 ? '用户名不能超过50个字符' : ''">
              <el-input
                v-model="username"
                type="text"
                placeholder="请输入您的用户名 (最多50个字符)"
                autocomplete="username"
                required
                :prefix-icon="User"
                maxlength="50"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="密码" :error="password && password.length < 6 ? '密码至少需要6个字符' : ''">
              <el-input
                v-model="password"
                type="password"
                placeholder="请输入您的密码 (至少6个字符)"
                autocomplete="new-password"
                required
                show-password
                :prefix-icon="Lock"
              />
            </el-form-item>

            <el-form-item label="确认密码" :error="passwordMismatech ? '两次输入的密码不一致' : ''">
              <el-input
                v-model="confirmPassword"
                type="password"
                placeholder="请再次输入您的密码"
                autocomplete="new-password"
                required
                show-password
                :prefix-icon="Lock"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="loading"
                :disabled="!isFormValid"
                @click="register"
                class="register-button"
              >
                {{ loading ? '注册中...' : '注册' }}
              </el-button>
            </el-form-item>
          </el-form>

          <div class="login-link">
            <span>已有帐户？</span>
            <router-link to="/login" class="link">登录</router-link>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
<script setup lang="ts">
import { useRegister } from '@/composables/useRegister';
import { Message, User, Lock } from '@element-plus/icons-vue';
import { ElCard,ElCol,ElRow,ElForm,ElFormItem,ElInput,ElButton,ElAlert, } from 'element-plus';

const { 
  username, 
  password,
  email,
  confirmPassword,
  error, 
  success, 
  loading,
  passwordMismatech,
  isValidEmail,
  isFormValid,
  register   
} = useRegister();
</script>

<style scoped src="../asset/register.css">
</style>
