// stores/userStore.ts
import { defineStore } from 'pinia'
import { api } from '@/api'

export const useUserStore = defineStore('user', {
  state: () => ({
     // 状态，是否授权
    isAuthenticated: false,
    user: null as null | { username: string },
    token: localStorage.getItem('token') || null,
    loading: false, // 添加loading状态
    err:null as string | null
    
   
  }),
  actions:{
    // 注册
    async register(userData:{username:string,password:string,email:string}){
        this.loading = true
        this.err = null
        try {
          const res = await api.post('/auth/register',userData)
          this.loading = false
          return res.data
        } catch (error:any) {
          this.err = error.response?.data?.message || '注册失败'
          this.loading = false
          throw error
        }
       
      
    },
    // 登录方法
    async login(useData:{username:string,password:string}){
        const res = await api.post('/auth/login', useData)
        // 保存用户信息和token
        this.user = { username: useData.username }
        this.token = res.data.access_token
        this.isAuthenticated = true
        localStorage.setItem('token', res.data.access_token)
        return res.data
    },
    logout(){ 
        this.user = null
        this.token = null
        this.isAuthenticated = false
        localStorage.removeItem('token')
    },
    async loadFormStorage(){
      const token = localStorage.getItem('token')
      if(token){
        try {
          // 使用token获取用户信息
          const response = await api.get('/auth/me',{
            headers:{
            Authorization:`Bearer ${token}`
            }
          })
          this.user = response.data
          this.token = token
          this.isAuthenticated = true
        } catch (error) {
          //token无效，清除缓存
          this.logout()
        }
     
      }
    }
  }
})