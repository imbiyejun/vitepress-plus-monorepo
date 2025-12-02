<template>
  <a-modal
    v-model:open="visible"
    title="选择复制格式"
    :footer="null"
    width="500px"
    @cancel="handleCancel"
  >
    <div class="copy-formats">
      <div
        v-for="format in copyFormats"
        :key="format.type"
        class="format-item"
        @click="handleCopy(format)"
      >
        <div class="format-header">
          <span class="format-title">{{ format.title }}</span>
          <span class="format-tag">{{ format.tag }}</span>
        </div>
        <div class="format-preview">{{ getPreviewText(format) }}</div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'

interface ImageInfo {
  path: string
  name: string
}

interface Props {
  image: ImageInfo | null
}

const props = defineProps<Props>()
const visible = ref(false)

// 复制格式定义
const copyFormats = [
  {
    type: 'markdown-vitepress',
    title: 'VitePress 格式',
    tag: 'VitePress',
    template: (image: ImageInfo) => {
      // 从路径中提取相对于 /images 的部分
      const relativePath = image.path.replace(/^https?:\/\/[^/]+\/images\//, '/images/')
      return `![${image.name.split('.')[0]}](${relativePath})`
    }
  },
  {
    type: 'markdown',
    title: 'Markdown 格式',
    tag: 'Markdown',
    template: (image: ImageInfo) => `![${image.name}](${image.path})`
  },
  {
    type: 'html',
    title: 'HTML 格式',
    tag: 'HTML',
    template: (image: ImageInfo) => `<img src="${image.path}" alt="${image.name}" />`
  },
  {
    type: 'url',
    title: '图片链接',
    tag: 'URL',
    template: (image: ImageInfo) => image.path
  },
  {
    type: 'relative',
    title: '相对路径',
    tag: 'Path',
    template: (image: ImageInfo) => image.path.replace(/^https?:\/\/[^/]+/, '')
  }
]

// 获取预览文本
const getPreviewText = (format: (typeof copyFormats)[0]) => {
  if (!props.image) return ''
  return format.template(props.image)
}

// 复制文本到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('复制失败:', err)
    return false
  }
}

// 处理复制
const handleCopy = async (format: (typeof copyFormats)[0]) => {
  if (!props.image) {
    message.error('没有选择图片')
    return
  }

  const text = format.template(props.image)
  const success = await copyToClipboard(text)

  if (success) {
    message.success(`已复制${format.title}`)
    handleCancel()
  } else {
    message.error('复制失败')
  }
}

const handleCancel = () => {
  visible.value = false
}

// 暴露方法给父组件
defineExpose({
  show: () => {
    if (!props.image) {
      message.error('没有选择图片')
      return
    }
    visible.value = true
  }
})
</script>

<style scoped>
.copy-formats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.format-item {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.format-item:hover {
  background: #f5f5f5;
  border-color: #1890ff;
}

.format-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.format-title {
  font-weight: 500;
  color: #1f1f1f;
}

.format-tag {
  font-size: 12px;
  color: #1890ff;
  background: #e6f7ff;
  padding: 2px 8px;
  border-radius: 10px;
}

.format-preview {
  font-family: monospace;
  font-size: 13px;
  color: #666;
  background: #fafafa;
  padding: 8px;
  border-radius: 4px;
  word-break: break-all;
}
</style>
