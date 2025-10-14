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
    // {
    //     path:'/profile',
    //     component:()=>import('@/pages/Profile.vue'),
    //     meta:{
    //         requiresAuth:true
    //     }
    // }
]
}

)
// 创建路由实例，配置路由历史模式为html

// 全局前置守卫，控制路由跳转时候的权限验证
// to: 即将要进入的目标路由对象
// from: 当前导航正要离开的路由对象
// next: 一个函数，表示放行，调用该方法，会跳转到下一个匹配的路由，如果没有匹配的路由，则不会进行跳转
// userStore: 获取用户的状态管理实例，用于检查用户的认证状态
router.beforeEach((to, from, next) =>{
    const userStore = useUserStore()
    if(to.meta.requiresAuth && !userStore.isAuthenticated){
        // 如果目标路由to需要认证且用户未登录，则跳转到登录页面
        next('/login')
    }else if((to.path === '/login' || to.path === '/register') && userStore.isAuthenticated){
        next('/dahboard')
        // 如果已经登录的用户尝试访问登录或者注册页面，则跳转到仪表盘页面
    }else{
        // 默认放行
        next()
    }
})
export default router