// stores/userStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'

export const useUserStore = defineStore('user', () => {
  // State - 使用 ref 定义响应式状态
  const isAuthenticated = ref(false)
  const user = ref<null | { username: string }>(null)
  const token = ref<string | null>(localStorage.getItem('token') || null)
  const loading = ref(false) // 添加loading状态
  const err = ref<string | null>(null)

  // Actions - 定义为普通函数
  
  // 注册
  async function register(userData: { username: string; password: string; email: string }) {
    loading.value = true
    err.value = null
    try {
      const res = await api.post('/auth/register', userData)
      loading.value = false
      return res.data
    } catch (error: any) {
      console.error('Registration error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      })
      
      // 后端返回的错误信息在 detail 字段中
      err.value = error.response?.data?.detail || '注册失败'
      loading.value = false
      throw error
    }
  }

  // 登录方法
  async function login(userData: { username: string; password: string }) {
    loading.value = true
    err.value = null
    try {
      const res = await api.post('/auth/login', userData)
      user.value = { username: userData.username }
      token.value = res.data.access_token
      isAuthenticated.value = true
      localStorage.setItem('token', res.data.access_token)
      loading.value = false
      return res.data
    } catch (error: any) {
      // 后端返回的错误信息在 detail 字段中
      err.value = error.response?.data?.detail || '登录失败'
      loading.value = false
      throw error
    }
  }

  // 登出方法
  function logout() {
    user.value = null
    token.value = null
    isAuthenticated.value = false
    localStorage.removeItem('token')
  }

  // 从本地存储加载用户信息
  async function loadFormStorage() {
    const storageToken = localStorage.getItem('token')
    if (storageToken) {
      try {
        // 使用token获取用户信息
        const response = await api.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${storageToken}`
          }
        })
        user.value = response.data
        token.value = storageToken
        isAuthenticated.value = true
      } catch (error) {
        // token无效，清除缓存
        logout()
      }
    }
  }

  // 返回所有需要暴露的状态和方法
  return {
    // State
    isAuthenticated,
    user,
    token,
    loading,
    err,
    // Actions
    register,
    login,
    logout,
    loadFormStorage
  }
})