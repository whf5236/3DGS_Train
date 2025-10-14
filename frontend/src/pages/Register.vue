<template>
  <div class="register">
    <div class="card shadow">
      <div class="card-body p-5">
        <h2 class="text-center mb-4">注册</h2>
        
        <div v-if="error" class="alert alert-danger">
          {{ error }}
        </div>
        
        <div v-if="success" class="alert alert-success">
          {{ success }}
        </div>
        
        <form @submit.prevent="register">
          <div class="mb-3">
          <label for="email" class="form-label">邮箱</label>
          <div class="custom-input-group">
          <i class="fas fa-envelope input-icon"></i>
      <input 
        type="email" 
        class="form-control" 
        id="email" 
        v-model="email"
        autocomplete="email" 
        required
        placeholder="请输入您的邮箱"
      >
    </div>
  </div>

          <div class="mb-3">
            <label for="username" class="form-label">用户名</label>
            <div class="custom-input-group">
              <i class="fas fa-user input-icon"></i>
              <input 
                type="text" 
                class="form-control" 
                id="username" 
                v-model="username"
                autocomplete="username" 
                required
                placeholder="请输入您的用户名"
              >
            </div>
          </div>
          
          <div class="mb-3">
            <label for="password" class="form-label">密码</label>
            <div class="custom-input-group">
              <i class="fas fa-lock input-icon"></i>
              <input 
                type="password" 
                class="form-control" 
                id="password" 
                v-model="password" 
                required
                autocomplete="new-password"
                placeholder="请输入您的密码"
              >
            </div>
          </div>
          
          <div class="mb-4">
            <label for="confirmPassword" class="form-label">确认密码</label>
            <div class="custom-input-group">
              <i class="fas fa-lock input-icon"></i>
              <input 
                type="password" 
                class="form-control" 
                id="confirmPassword" 
                v-model="confirmPassword" 
                required
                autocomplete="new-password"
                placeholder="请再次输入您的密码"
              >
            </div>
            <div v-if="passwordMismatech" class="text-danger mt-1">
              密码不匹配
            </div>
          </div>
          
          <div class="d-grid">
            <button type="submit" class="btn btn-primary btn-lg" :disabled="!!(loading || passwordMismatech)">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
              {{ loading ? 'Registering...' : 'Register' }}
            </button>
          </div>
        </form>
        
        <div class="text-center mt-4">
          <p>已有帐户? <router-link to="/login">登录</router-link></p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts" >
import { useRegister } from '@/composables/useRegister';
const { username, 
        password,
        email,
        confirmPassword,
        error, 
        success, 
        loading,
        passwordMismatech,
        register   } = useRegister();
</script>
<style scoped src="../asset/Register.css">
</style>