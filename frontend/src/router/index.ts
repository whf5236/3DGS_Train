import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "@/stores/userStore";
import Home from "@/pages/Home.vue";
import Login from "@/pages/Login.vue";
// 定义路由
const router = createRouter({
    history: createWebHistory(),
    routes:[{
        path: '/',
        name:'home',
        component:Home,
        meta:{layout:'AppLayout'}    
    },
    {
        path:'/login',
        component:Login,
        meta:{layout:'AppLayout'}
    },
    {
        path:'/register',
        component:()=>import('@/pages/Register.vue'),
        meta:{layout:'AppLayout'}
    },
    {
        path:'/dashboard',
        component:()=>import('@/pages/Dashboard.vue'),
        meta:{
            requiresAuth:true
        }
    },
]
}

)
// 创建路由实例，配置路由历史模式为html

// 全局前置守卫，控制路由跳转时候的权限验证

router.beforeEach((to, from, next) =>{
    const userStore = useUserStore()
    if(to.meta.requiresAuth && !userStore.isAuthenticated){
        // 如果目标路由to需要认证且用户未登录，则跳转到登录页面
        next('/login')
    }else if((to.path === '/login' || to.path === '/register') && userStore.isAuthenticated){
        next('/dashboard')
        // 如果已经登录的用户尝试访问登录或者注册页面，则跳转到仪表盘页面
    }else{
        // 默认放行
        next()
    }
})
export default router