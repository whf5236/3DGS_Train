import { ref } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/userStore";
export function useLogin() {
    const router = useRouter()
    const userStore = useUserStore()
    const username = ref("");
    const password = ref("");
    const loading = ref(false)
    const error = ref('')
    const handleLogin = async () => { 
        if(!username.value|| !password.value){
            error.value = '请输入用户名和密码'
            return
        }
        
        loading.value = true
        error.value = ''
        
        try {
           const response = await userStore.login({
            username: username.value,
            password: password.value
           })
            // 登录成功->跳转到Dashboard
            if(response && response.access_token){
                router.push("/Dashboard")  
            }
            else{
                error.value = '登录失败：响应格式错误'
            }
            }catch(err:any){
                error.value = err.response?.data?.message || '登录失败'       
            }finally{
            loading.value = false
        }
    }

    return {
        username,
        password,
        loading,
        error,
        handleLogin
    };
}