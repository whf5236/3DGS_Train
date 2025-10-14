import { ref,computed } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/userStore";

export function useRegister() { 
    const router = useRouter()
    const userStore = useUserStore()

    // 状态
    const username = ref("");
    const password = ref("");
    const email = ref("")
    const confirmPassword = ref("");
    const error = ref<string|null>(null)
    const success = ref<string|null>(null)
    const loading = ref(false)

    // 计算属性
    const passwordMismatech = computed(() =>{
        return password.value && confirmPassword.value 
        && password.value !== confirmPassword.value
    })
    // 注册方法
    const register = async () => { 
        if(passwordMismatech.value) 
            return //如果密码不匹配，则返回
        loading.value = true
        error.value = null
        success.value = null

        try {
            await userStore.register({
                username: username.value,
                password: password.value,
                email:email.value
            })
        success.value = "注册成功！2秒后跳转至登录页面..."

        // 清空表单
        username.value = ""
        password.value = ""
        email.value = ""
        confirmPassword.value = ""

        // 延迟跳转
        setTimeout(()=>{
            router.push("/login")
        },2000)

        
    }catch (err: any) {
        error.value = err.response.data?.message || '注册失败,请重试'
        
    }finally{
        loading.value = false

    }
}
return { 
    username,
    password,
    email,
    confirmPassword,
    error,
    success,
    loading,
    passwordMismatech,
    register
}

    

}
