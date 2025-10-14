import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { Ref } from 'vue'

// 定义文件类型接口
interface FileItem {
  filename: string
  type: string
  size: number
  path: string
}

// 定义 props 类型
interface FilePreviewProps {
  selectedFile: FileItem | null
  fileList: FileItem[]
}

export function useFilePreview(props: Ref<FilePreviewProps>, emit: (event: 'select-file', file: FileItem) => void) {
  // --- Template Refs ---
  const imagePreviewContainer = ref<HTMLElement | null>(null)
  const previewImage = ref<any>(null)

  // --- State ---
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const zoomLevel = ref(1.0)
  const fileUrl = ref<string | null>(null)
  const isDragging = ref(false)
  const startX = ref(0)
  const startY = ref(0)
  const scrollLeft = ref(0)
  const scrollTop = ref(0)
  const currentIndex = ref(-1)

  // --- Computed Properties ---
  const isImage = computed(() => {
    if (!props.value.selectedFile) return false
    const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
    return imageTypes.includes(props.value.selectedFile.type.toLowerCase())
  })

  const isVideo = computed(() => {
    if (!props.value.selectedFile) return false
    const videoTypes = ['mp4', 'webm', 'ogg', 'avi', 'mov']
    return videoTypes.includes(props.value.selectedFile.type.toLowerCase())
  })

  const imageFiles = computed(() => {
    return props.value.fileList.filter(file => {
      const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
      return imageTypes.includes(file.type.toLowerCase())
    })
  })

  const hasPrevImage = computed(() => currentIndex.value > 0)
  const hasNextImage = computed(() => currentIndex.value < imageFiles.value.length - 1)

  // --- Methods ---
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const loadFile = async (file: FileItem) => {
    loading.value = true
    loadError.value = null
    zoomLevel.value = 1.0

    // 判断是本地文件 URL（blob:// 或 data:// 开头）还是服务器文件路径
    if (file.path.startsWith('blob:') || file.path.startsWith('data:')) {
      // 本地文件，直接使用 path 作为 URL
      fileUrl.value = file.path
    } else {
      // 服务器文件，构建完整 URL
      const baseUrl = `http://localhost:8000${file.path}`
      fileUrl.value = `${baseUrl}?t=${new Date().getTime()}`
    }

    if (isImage.value) {
      await nextTick()
      const img = new Image()
      img.onload = () => {
        loading.value = false
        // 使用 requestAnimationFrame 避免 ResizeObserver 循环
        window.requestAnimationFrame(() => {
          const container = imagePreviewContainer.value
          if (container) {
            const containerWidth = container.clientWidth
            const containerHeight = container.clientHeight
            const imgWidth = img.width
            const imgHeight = img.height

            const widthRatio = containerWidth / imgWidth
            const heightRatio = containerHeight / imgHeight
            const fitRatio = Math.min(widthRatio, heightRatio)

            if (fitRatio > 1.0) {
              zoomLevel.value = Math.min(fitRatio, 2.0)
            } else {
              zoomLevel.value = Math.max(fitRatio, 0.7)
            }

            container.scrollLeft = 0
            container.scrollTop = 0
          }
        })
      }
      img.onerror = (error) => {
        loading.value = false
        loadError.value = 'Failed to load image. File may not exist or is corrupt.'
        console.error('Failed to load image:', error)
      }
      img.src = fileUrl.value
    } else {
      loading.value = false
    }
  }

  const retryLoad = () => {
    if (props.value.selectedFile) {
      loadFile(props.value.selectedFile)
    }
  }

  const handleImageError = (error: Event) => {
    loadError.value = 'Failed to display image. The file may not exist or you may not have permission to view it.'
    console.error('Image error:', error)
  }

  const handleVideoError = (error: Event) => {
    loadError.value = 'Failed to load video. The file may not exist or you may not have permission to view it.'
    console.error('Video error:', error)
  }

  const increaseZoom = () => {
    if (zoomLevel.value < 5) {
      zoomLevel.value = Math.min(5, parseFloat((zoomLevel.value + 0.1).toFixed(1)))
    }
  }

  const decreaseZoom = () => {
    if (zoomLevel.value > 0.2) {
      zoomLevel.value = Math.max(0.2, parseFloat((zoomLevel.value - 0.1).toFixed(1)))
    }
  }

  const resetZoom = () => {
    // 使用 requestAnimationFrame 避免 ResizeObserver 循环
    window.requestAnimationFrame(() => {
      const container = imagePreviewContainer.value
      const imgEl = previewImage.value?.$el

      if (isImage.value && container && imgEl?.naturalWidth) {
        const imgWidth = imgEl.naturalWidth
        const imgHeight = imgEl.naturalHeight

        const containerWidth = container.clientWidth
        const containerHeight = container.clientHeight

        const widthRatio = containerWidth / imgWidth
        const heightRatio = containerHeight / imgHeight

        const fitRatio = Math.min(widthRatio, heightRatio)

        if (fitRatio > 1.0) {
          zoomLevel.value = Math.min(fitRatio, 2.0)
        } else {
          zoomLevel.value = Math.max(fitRatio, 0.7)
        }

        container.scrollLeft = 0
        container.scrollTop = 0
      } else {
        zoomLevel.value = 1.0
      }
    })
  }

  const handleWheel = (event: WheelEvent) => {
    const container = imagePreviewContainer.value
    if (!container) return

    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9
    const newZoom = parseFloat((zoomLevel.value * zoomFactor).toFixed(2))

    if (newZoom >= 0.2 && newZoom <= 5) {
      const oldZoom = zoomLevel.value
      
      // 使用 requestAnimationFrame 避免 ResizeObserver 循环
      window.requestAnimationFrame(() => {
        zoomLevel.value = newZoom

        const rect = container.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top

        const newScrollLeft = container.scrollLeft * (newZoom / oldZoom) + (mouseX * (newZoom / oldZoom) - mouseX)
        const newScrollTop = container.scrollTop * (newZoom / oldZoom) + (mouseY * (newZoom / oldZoom) - mouseY)

        container.scrollLeft = newScrollLeft
        container.scrollTop = newScrollTop
      })
    }
  }

  const openInNewTab = () => {
    if (fileUrl.value) {
      window.open(fileUrl.value, '_blank')
    }
  }

  const downloadFile = () => {
    if (fileUrl.value && props.value.selectedFile) {
      const link = document.createElement('a')
      link.href = fileUrl.value
      link.download = props.value.selectedFile.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const startDrag = (e: MouseEvent | TouchEvent) => {
    if (!isImage.value) return
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = true

    const touchPointStart = 'touches' in e
      ? ((e as TouchEvent).touches?.[0] ?? (e as TouchEvent).changedTouches?.[0] ?? null)
      : null
    const pageX = 'pageX' in e
      ? (e as MouseEvent).pageX
      : (touchPointStart?.pageX ?? 0)
    const pageY = 'pageY' in e
      ? (e as MouseEvent).pageY
      : (touchPointStart?.pageY ?? 0)
    
    startX.value = pageX
    startY.value = pageY

    const container = imagePreviewContainer.value
    if (container) {
      scrollLeft.value = container.scrollLeft
      scrollTop.value = container.scrollTop
    }
  }

  const onDrag = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value) return
    e.preventDefault()
    e.stopPropagation()

    const touchPointMove = 'touches' in e
      ? ((e as TouchEvent).touches?.[0] ?? (e as TouchEvent).changedTouches?.[0] ?? null)
      : null
    const pageX = 'pageX' in e
      ? (e as MouseEvent).pageX
      : (touchPointMove?.pageX ?? startX.value)
    const pageY = 'pageY' in e
      ? (e as MouseEvent).pageY
      : (touchPointMove?.pageY ?? startY.value)
    
    const moveX = pageX - startX.value
    const moveY = pageY - startY.value

    const container = imagePreviewContainer.value
    if (container) {
      container.scrollLeft = scrollLeft.value - moveX
      container.scrollTop = scrollTop.value - moveY
    }
  }

  const stopDrag = () => {
    isDragging.value = false
  }

  const updateCurrentIndex = () => {
    if (!props.value.selectedFile || imageFiles.value.length === 0) {
      currentIndex.value = -1
      return
    }
    currentIndex.value = imageFiles.value.findIndex(file => file.path === props.value.selectedFile!.path)
  }

  const prevImage = () => {
    if (!hasPrevImage.value) return
    const prevFile = imageFiles.value[currentIndex.value - 1]!
    emit('select-file', prevFile)
  }

  const nextImage = () => {
    if (!hasNextImage.value) return
    const nextFile = imageFiles.value[currentIndex.value + 1]!
    emit('select-file', nextFile)
  }

  // --- Watchers ---
  watch(() => props.value.selectedFile, (newFile) => {
    if (newFile) {
      loadFile(newFile)
      updateCurrentIndex()
    } else {
      fileUrl.value = null
      currentIndex.value = -1
    }
    resetZoom()
  }, { immediate: true })

  watch(() => props.value.fileList, () => {
    updateCurrentIndex()
  })

  // --- Lifecycle Hooks ---
  onMounted(() => {
    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', stopDrag)
    window.addEventListener('touchmove', onDrag, { passive: false })
    window.addEventListener('touchend', stopDrag)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
    window.removeEventListener('touchmove', onDrag)
    window.removeEventListener('touchend', stopDrag)
  })

  return {
    // Template refs
    imagePreviewContainer,
    previewImage,
    
    // State
    loading,
    loadError,
    zoomLevel,
    fileUrl,
    isDragging,
    currentIndex,
    
    // Computed
    isImage,
    isVideo,
    imageFiles,
    hasPrevImage,
    hasNextImage,
    
    // Methods
    formatFileSize,
    loadFile,
    retryLoad,
    handleImageError,
    handleVideoError,
    increaseZoom,
    decreaseZoom,
    resetZoom,
    handleWheel,
    openInNewTab,
    downloadFile,
    startDrag,
    onDrag,
    stopDrag,
    updateCurrentIndex,
    prevImage,
    nextImage
  }
}