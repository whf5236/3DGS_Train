import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import Particles from "@tsparticles/vue3";
import { loadSlim } from "@tsparticles/slim"
import { useUserStore } from './stores/userStore'

async function initApp() {
  const app = createApp(App)

  app.use(createPinia())

  // 在创建 Pinia 实例后，初始化用户状态
  const userStore = useUserStore()
  await userStore.loadFormStorage()

  app.use(router)
  app.use(ElementPlus)

  app.use(Particles, {
    init: async engine => {
      await loadSlim(engine); 
    },
  });
  
  app.mount('#app')
}

// 初始化应用
initApp()