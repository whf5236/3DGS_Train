<template>
  <div class="file-icon" :style="{ fontSize: size + 'px' }">
    <el-icon :color="iconInfo.color" :size="size">
      <component :is="iconInfo.icon" />
    </el-icon>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCommon } from '@/composables/useUpload/common'
import { ElIcon } from 'element-plus'

const { getFileTypeInfo } = useCommon()

interface Props {
  item: any
  size?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  size: 20
})

const iconInfo = computed(() => {
  // 使用 getFileTypeInfo 获取图标信息，
  return getFileTypeInfo(
    props.item.name, 
    props.item.item_type === 'folder',
    props.item.stage  // 使用后端返回的 stage 字段
  )
})
</script>

<style scoped>
.file-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>