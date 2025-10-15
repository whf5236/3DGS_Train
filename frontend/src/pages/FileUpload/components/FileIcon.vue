<template>
  <div class="file-icon" :style="{ fontSize: size + 'px' }">
    <el-icon :color="iconInfo.color" :size="size">
      <component :is="iconInfo.icon" />
    </el-icon>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFileUtils } from '@/composables/useUpload/useFileUtils'
import { ElIcon } from 'element-plus';
const { getFileTypeInfo } = useFileUtils()

interface Props {
  item: any
  size?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  size: 20
})

const iconInfo = computed(() => {
  // 正确传递参数：文件名和是否为文件夹
  return getFileTypeInfo(
    props.item.name, 
    props.item.item_type === 'folder'
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