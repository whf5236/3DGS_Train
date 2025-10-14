<template>
  <div class="auth-layout">
    <!-- 背景装饰 -->
    <div class="auth-background">
      <div class="auth-particles"></div>
    </div>
    
    <!-- 主要内容区域 -->
    <div class="auth-container">
      <!-- 左侧装饰区域 -->
      <div class="auth-decoration">
        <div class="decoration-content">
          <h1 class="system-title">3D Gaussian Splatting</h1>
          <p class="system-subtitle">点云处理与可视化系统</p>
          <div class="feature-list">
            <div class="feature-item">
              <el-icon><VideoCamera /></el-icon>
              <span>视频上传处理</span>
            </div>
            <div class="feature-item">
              <el-icon><Cpu /></el-icon>
              <span>智能点云生成</span>
            </div>
            <div class="feature-item">
              <el-icon><View /></el-icon>
              <span>3D 可视化展示</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧认证表单区域 -->
      <div class="auth-form-container">
        <div class="auth-form-wrapper">
          <!-- 标题区域 -->
          <div class="auth-header">
            <h2 class="auth-title">{{ isLogin ? '登录' : '注册' }}</h2>
            <p class="auth-subtitle">{{ isLogin ? '欢迎回来' : '创建新账户' }}</p>
          </div>
          
          <!-- 表单区域 -->
          <el-form 
            ref="authFormRef" 
            :model="authForm" 
            :rules="authRules" 
            class="auth-form"
            size="large"
          >
            <!-- 用户名 -->
            <el-form-item prop="username">
              <el-input
                v-model="authForm.username"
                placeholder="用户名"
                prefix-icon="User"
                clearable
              />
            </el-form-item>
            
            <!-- 邮箱（注册时显示） -->
            <el-form-item v-if="!isLogin" prop="email">
              <el-input
                v-model="authForm.email"
                placeholder="邮箱地址"
                prefix-icon="Message"
                clearable
              />
            </el-form-item>
            
            <!-- 密码 -->
            <el-form-item prop="password">
              <el-input
                v-model="authForm.password"
                type="password"
                placeholder="密码"
                prefix-icon="Lock"
                show-password
                clearable
              />
            </el-form-item>
            
            <!-- 确认密码（注册时显示） -->
            <el-form-item v-if="!isLogin" prop="confirmPassword">
              <el-input
                v-model="authForm.confirmPassword"
                type="password"
                placeholder="确认密码"
                prefix-icon="Lock"
                show-password
                clearable
              />
            </el-form-item>
            
            <!-- 记住我（登录时显示） -->
            <el-form-item v-if="isLogin" class="remember-me">
              <el-checkbox v-model="authForm.rememberMe">记住我</el-checkbox>
              <el-link type="primary" class="forgot-password">忘记密码？</el-link>
            </el-form-item>
            
            <!-- 提交按钮 -->
            <el-form-item>
              <el-button 
                type="primary" 
                class="auth-submit-btn"
                :loading="loading"
                @click="handleSubmit"
              >
                {{ isLogin ? '登录' : '注册' }}
              </el-button>
            </el-form-item>
          </el-form>
          
          <!-- 切换登录/注册 -->
          <div class="auth-switch">
            <span>{{ isLogin ? '还没有账户？' : '已有账户？' }}</span>
            <el-link type="primary" @click="toggleAuthMode">
              {{ isLogin ? '立即注册' : '立即登录' }}
            </el-link>
          </div>
          
          <!-- 第三方登录 -->
          <div class="social-login">
            <el-divider>或</el-divider>
            <div class="social-buttons">
              <el-button class="social-btn github">
                <el-icon><Platform /></el-icon>
                GitHub
              </el-button>
              <el-button class="social-btn google">
                <el-icon><ChromeFilled /></el-icon>
                Google
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 路由视图（用于显示具体的认证页面） -->
    <router-view />
  </div>
</template>

<script setup lang="ts" name="AuthLayout">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Lock, Message, VideoCamera, Cpu, View, Platform, ChromeFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

// 响应式数据
const isLogin = ref(true)
const loading = ref(false)
const authFormRef = ref<FormInstance>()

// 表单数据
const authForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  rememberMe: false
})

// 表单验证规则
const authRules = reactive<FormRules>({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== authForm.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
})

// 切换登录/注册模式
const toggleAuthMode = () => {
  isLogin.value = !isLogin.value
  // 清空表单
  authFormRef.value?.resetFields()
  Object.assign(authForm, {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false
  })
}

// 处理表单提交
const handleSubmit = async () => {
  if (!authFormRef.value) return
  
  try {
    await authFormRef.value.validate()
    loading.value = true
    
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    if (isLogin.value) {
      ElMessage.success('登录成功！')
      // 这里应该调用登录 API 并跳转到主页
    } else {
      ElMessage.success('注册成功！')
      // 这里应该调用注册 API
      isLogin.value = true // 注册成功后切换到登录模式
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.auth-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: -1;
}

.auth-particles {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%);
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

.auth-container {
  display: flex;
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

.auth-decoration {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: white;
}

.decoration-content {
  max-width: 500px;
  text-align: center;
}

.system-title {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 1rem;
  background: linear-gradient(45deg, #fff, #e0e7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.system-subtitle {
  font-size: 1.2rem;
  margin-bottom: 3rem;
  opacity: 0.9;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 1.1rem;
  opacity: 0.9;
}

.feature-item .el-icon {
  font-size: 1.5rem;
  color: #e0e7ff;
}

.auth-form-container {
  flex: 0 0 450px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.2);
}

.auth-form-wrapper {
  width: 100%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-title {
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.auth-subtitle {
  color: #6b7280;
  font-size: 1rem;
}

.auth-form {
  margin-bottom: 1.5rem;
}

.auth-form .el-form-item {
  margin-bottom: 1.5rem;
}

.remember-me {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-password {
  font-size: 0.9rem;
}

.auth-submit-btn {
  width: 100%;
  height: 48px;
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.auth-submit-btn:hover {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.auth-switch {
  text-align: center;
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.auth-switch .el-link {
  margin-left: 0.5rem;
  font-weight: bold;
}

.social-login {
  margin-top: 1.5rem;
}

.social-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.social-btn {
  flex: 1;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: bold;
}

.social-btn.github {
  background: #24292e;
  color: white;
  border: none;
}

.social-btn.github:hover {
  background: #1a1e22;
}

.social-btn.google {
  background: #4285f4;
  color: white;
  border: none;
}

.social-btn.google:hover {
  background: #3367d6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .auth-container {
    flex-direction: column;
  }
  
  .auth-decoration {
    flex: 0 0 auto;
    padding: 1rem;
  }
  
  .system-title {
    font-size: 2rem;
  }
  
  .feature-list {
    flex-direction: row;
    justify-content: center;
    gap: 2rem;
  }
  
  .auth-form-container {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .auth-form-wrapper {
    margin: 1rem;
    padding: 2rem;
  }
}
</style>