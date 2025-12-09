<template>
  <div class="image-compressor">
    <div class="preview-container">
      <div class="preview-item">
        <div class="preview-title">原始图片 ({{ formatFileSize(originalSize) }})</div>
        <div class="preview-image">
          <a-image :src="imageUrl" alt="原始图片" :preview-mask-hover="true" />
        </div>
      </div>
      <div class="preview-item">
        <div class="preview-title">压缩预览 ({{ formatFileSize(compressedSize) }})</div>
        <div class="preview-image">
          <a-image
            v-if="compressedImageUrl"
            :src="compressedImageUrl"
            alt="压缩预览"
            :preview-mask-hover="true"
          />
        </div>
      </div>
    </div>
    <div class="compress-controls">
      <div class="quality-slider">
        <span class="quality-label">压缩质量: {{ quality }}%</span>
        <a-slider
          v-model:value="quality"
          :min="1"
          :max="100"
          :step="1"
          @afterChange="handleQualityChange"
        />
      </div>
      <div class="compress-actions">
        <a-button type="primary" @click="handleConfirm">确认压缩</a-button>
        <a-button @click="handleCancel">取消</a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { message, Image as AImage } from 'ant-design-vue'

const props = defineProps<{
  imageUrl: string
  originalSize: number
}>()

const emit = defineEmits(['confirm', 'cancel'])

const quality = ref(80)
const compressedImageUrl = ref('')
const compressedSize = ref(0)

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

// 压缩图片
const compressImage = async (quality: number) => {
  return new Promise<string>((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', quality / 100))
    }
    img.onerror = reject
    img.src = props.imageUrl
  })
}

// 计算压缩后的大小
const calculateCompressedSize = (dataUrl: string): number => {
  const base64 = dataUrl.split(',')[1]
  return atob(base64).length
}

// 处理质量变化
const handleQualityChange = async (value: number) => {
  if (!value) return // 如果没有值，直接返回

  try {
    message.loading({ content: '正在计算压缩效果...', key: 'compressing' })
    const compressedData = await compressImage(value)
    compressedImageUrl.value = compressedData
    compressedSize.value = calculateCompressedSize(compressedData)
    message.success({ content: '压缩预览已更新', key: 'compressing', duration: 1 })
  } catch (error) {
    console.error('压缩预览失败:', error)
    message.error({ content: '压缩预览失败', key: 'compressing' })
  }
}

// 确认压缩
const handleConfirm = async () => {
  if (!compressedImageUrl.value) {
    message.error('请等待压缩预览完成')
    return
  }
  emit('confirm', {
    dataUrl: compressedImageUrl.value,
    quality: quality.value,
    size: compressedSize.value
  })
}

// 暴露方法给父组件
defineExpose({
  handleConfirm
})

// 取消压缩
const handleCancel = () => {
  emit('cancel')
}

// 初始化压缩预览
watch(
  () => props.imageUrl,
  async () => {
    if (props.imageUrl) {
      // 使用默认质量进行初始压缩
      try {
        const compressedData = await compressImage(quality.value)
        compressedImageUrl.value = compressedData
        compressedSize.value = calculateCompressedSize(compressedData)
      } catch (error) {
        console.error('初始压缩预览失败:', error)
        message.error('初始压缩预览失败')
      }
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.image-compressor {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
}

.preview-container {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.preview-item {
  flex: 1;
  max-width: 400px;
}

.preview-title {
  margin-bottom: 12px;
  text-align: center;
  font-size: 14px;
  color: #666;
}

.preview-image {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  background: #fafafa;

  :deep(.ant-image) {
    width: 100%;
    display: block;
  }

  :deep(.ant-image-img) {
    width: 100%;
    height: auto;
    display: block;
  }
}

.compress-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 400px;
  margin: 0 auto;
  width: 100%;
}

.quality-slider {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quality-label {
  font-size: 14px;
  color: #666;
}

.compress-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
