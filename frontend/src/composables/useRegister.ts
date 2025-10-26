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
        return !!(password.value && confirmPassword.value 
        && password.value !== confirmPassword.value)
    })

    // 邮箱格式验证
    const isValidEmail = computed(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email.value)
    })

    // 表单是否可以提交
    const isFormValid = computed(() => {
        return !passwordMismatech.value && 
               username.value.trim().length > 0 && 
               email.value.trim().length > 0 && 
               password.value.length > 0 && 
               confirmPassword.value.length > 0 && 
               isValidEmail.value && 
               username.value.length <= 50 && 
               email.value.length <= 100 && 
               password.value.length >= 6
    })

    // 表单验证
    const validateForm = () => {
        // 检查必填字段
        if (!username.value.trim()) {
            error.value = "请输入用户名"
            return false
        }
        if (!email.value.trim()) {
            error.value = "请输入邮箱"
            return false
        }
        if (!password.value) {
            error.value = "请输入密码"
            return false
        }
        if (!confirmPassword.value) {
            error.value = "请确认密码"
            return false
        }

        // 检查字段长度
        if (username.value.length > 50) {
            error.value = "用户名不能超过50个字符"
            return false
        }
        if (email.value.length > 100) {
            error.value = "邮箱不能超过100个字符"
            return false
        }

        // 检查邮箱格式
        if (!isValidEmail.value) {
            error.value = "请输入有效的邮箱地址"
            return false
        }

        // 检查密码匹配
        if (passwordMismatech.value) {
            error.value = "两次输入的密码不一致"
            return false
        }

        // 检查密码长度
        if (password.value.length < 6) {
            error.value = "密码至少需要6个字符"
            return false
        }

        return true
    }

    // 注册方法
    const register = async () => { 
        error.value = null
        success.value = null

        // 客户端验证
        if (!validateForm()) {
            return
        }

        loading.value = true

        try {
            await userStore.register({
                username: username.value.trim(),
                password: password.value,
                email: email.value.trim().toLowerCase()
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
        // 处理不同类型的错误
        if (err.response?.status === 422) {
            // 处理验证错误
            const detail = err.response.data?.detail
            if (Array.isArray(detail)) {
                // Pydantic 验证错误
                const errorMessages = detail.map((item: any) => {
                    const field = item.loc?.[item.loc.length - 1] || 'unknown'
                    const message = item.msg || 'validation error'
                    return `${field}: ${message}`
                }).join(', ')
                error.value = `输入验证失败: ${errorMessages}`
            } else if (typeof detail === 'string') {
                error.value = detail
            } else {
                error.value = '输入数据格式错误，请检查所有字段'
            }
        } else if (err.response?.status === 400) {
            // 处理业务逻辑错误（如用户名已存在）
            error.value = err.response.data?.detail || '用户名或邮箱已存在'
        } else {
            // 其他错误
            error.value = err.response?.data?.detail || err.response?.data?.message || '注册失败，请重试'
        }
        
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
    isValidEmail,
    isFormValid,
    register
}

    

}
