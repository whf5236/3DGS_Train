<template>
  <div class="splat-editor-container">
    <div id="splat-editor-root" class="splat-editor-root"></div>
  </div>
</template>

<script setup lang="ts" name="SplatEditorWrapper">
import { ref, onMounted, onUnmounted } from 'vue'
import { main } from './index'
import './src/ui/scss/style.scss'

// 状态管理
const isInitialized = ref(false)

// 初始化 SuperSplat
const initializeSplatEditor = async () => {
  try {
    // 启动 SuperSplat 主程序
    await main('splat-editor-root')
    isInitialized.value = true
    console.log('SuperSplat editor initialized successfully')
  } catch (error) {
    console.error('Failed to initialize SuperSplat editor:', error)
    isInitialized.value = false
  }
}

// 清理资源
const cleanupSplatEditor = () => {
  // 清理 WebGL 上下文和事件监听器
  const scene = (window as any).scene
  const events = scene?.events
  if (events) {
    // 移除所有事件监听器
    try {
      events.removeAll?.()
    } catch (e) {
      console.warn('Could not clean up events:', e)
    }
  }

  // 清理 Scene
  if (scene) {
    try {
      scene.destroy?.()
    } catch (e) {
      console.warn('Could not destroy scene:', e)
    }
  }

  isInitialized.value = false
}

// 生命周期
onMounted(async () => {
  await initializeSplatEditor()
})

onUnmounted(() => {
  cleanupSplatEditor()
})

// 导出 API 供外部调用
defineExpose({
  isInitialized,
  loadFile: async (file: File) => {
    const scene = (window as any).scene
    if (scene?.events) {
      const contents = await file.arrayBuffer()
      await scene.events.invoke('import', [{
        filename: file.name,
        contents: new Blob([contents])
      }])
    }
  },
  getEditedData: () => {
    const scene = (window as any).scene
    if (scene) {
      return scene.getSplats?.()
    }
    return null
  },
  exportFile: async (format: 'ply' | 'splat' = 'ply') => {
    const scene = (window as any).scene
    if (scene?.events) {
      return await scene.events.invoke('export', [{ format }])
    }
    return null
  }
})
</script>

<style scoped lang="css">
.splat-editor-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  overflow: hidden;
}

.splat-editor-root {
  width: 100%;
  height: 100%;
  position: relative;
  flex: 1;
}

/* 防止全局样式污染 */
.splat-editor-container :deep(*) {
  box-sizing: border-box;
}

.splat-editor-container :deep(body) {
  margin: 0;
  padding: 0;
}

.splat-editor-container :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
