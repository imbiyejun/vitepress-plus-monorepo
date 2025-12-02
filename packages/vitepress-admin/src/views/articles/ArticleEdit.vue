<template>
  <div class="article-edit" ref="editorContainerRef">
    <a-spin :spinning="loading" :style="{ height: '100%' }">
      <MdEditor
        v-if="editorHeight"
        ref="editorRef"
        v-model="displayContent"
        :toolbars="toolbars"
        @onUploadImg="handleUploadImg"
        @onSave="handleSave"
        @onChange="handleContentChange"
        :preview-theme="'vitepress'"
        :code-theme="'github'"
        :style="{ height: editorHeight + 'px' }"
        language="zh-CN"
        preview-class="vp-doc"
      />
    </a-spin>

    <!-- Custom image menu modal -->
    <a-modal
      v-model:open="imageMenuVisible"
      title="图片操作"
      :footer="null"
      :width="280"
      :centered="true"
      @cancel="imageMenuVisible = false"
    >
      <a-menu @click="handleImageMenuClick" style="border: none">
        <a-menu-item key="addLink">
          <link-outlined style="margin-right: 8px" />
          添加链接
        </a-menu-item>
        <a-menu-item key="uploadImage">
          <upload-outlined style="margin-right: 8px" />
          上传图片
        </a-menu-item>
        <a-menu-item key="selectImage">
          <file-image-outlined style="margin-right: 8px" />
          选择图片
        </a-menu-item>
      </a-menu>
    </a-modal>

    <!-- Image selector modal for selecting existing images -->
    <image-selector-modal ref="imageSelectorRef" @select="handleImageSelect" />

    <!-- Upload modal for uploading new images -->
    <upload-modal
      ref="uploadModalRef"
      :allow-storage-switch="true"
      @success="handleUploadSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { LinkOutlined, UploadOutlined, FileImageOutlined } from '@ant-design/icons-vue'
import { MdEditor, type ToolbarNames } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
// Import VitePress theme styles for preview
import 'vitepress/dist/client/theme-default/styles/base.css'
import 'vitepress/dist/client/theme-default/styles/vars.css'
import 'vitepress/dist/client/theme-default/styles/components/vp-doc.css'
import { articleApi, topicApi } from '@/services/api'
import ImageSelectorModal from '@/components/image/ImageSelectorModal.vue'
import UploadModal from '@/components/image/UploadModal.vue'

const route = useRoute()

const loading = ref(false)
const content = ref('') // Original content with frontmatter
const displayContent = ref('') // Content without frontmatter for display
const topicSlug = ref('')
const articleSlug = ref('')
const imageSelectorRef = ref()
const uploadModalRef = ref()
const pendingImageCallback = ref<((url: string) => void) | null>(null)
const pendingUploadCallback = ref<((urls: string[]) => void) | null>(null)
const editorContainerRef = ref<HTMLElement>()
const editorHeight = ref(0)
const frontmatterContent = ref('') // Store frontmatter separately
const editorRef = ref()
const imageMenuVisible = ref(false)

// Toolbar configuration with save button
const toolbars: ToolbarNames[] = [
  'bold',
  'underline',
  'italic',
  'strikeThrough',
  '-',
  'title',
  'quote',
  'unorderedList',
  'orderedList',
  'task',
  '-',
  'codeRow',
  'code',
  'link',
  'image', // Use default image button
  'table',
  '-',
  'revoke',
  'next',
  '=',
  'pageFullscreen',
  'fullscreen',
  'preview',
  'catalog',
  '-',
  'save'
]

// Intercept image button click
const setupImageButtonInterception = () => {
  nextTick(() => {
    if (!editorContainerRef.value) return

    // Find the image button in the toolbar
    const toolbar = editorContainerRef.value.querySelector('.md-editor-toolbar')
    if (!toolbar) return

    // Find image button by looking for the image icon
    const buttons = Array.from(toolbar.querySelectorAll('.md-editor-toolbar-item'))
    let targetButton: HTMLElement | undefined

    for (const button of buttons) {
      const title = button.getAttribute('title') || button.getAttribute('data-title')
      // Check if it's the image button (title might be "图片" or "image")
      if (title && (title.includes('图片') || title.toLowerCase().includes('image'))) {
        targetButton = button as HTMLElement
        break
      }
    }

    if (targetButton) {
      // Replace button with custom handler
      const imageButton = targetButton
      const newImageButton = imageButton.cloneNode(true) as HTMLElement
      const parent = imageButton.parentNode

      if (parent) {
        parent.replaceChild(newImageButton, imageButton)

        newImageButton.addEventListener('click', (e: Event) => {
          e.preventDefault()
          e.stopPropagation()
          // Show image menu modal
          imageMenuVisible.value = true
        })
      }
    }
  })
}

// Handle image menu item click
const handleImageMenuClick = ({ key }: { key: string }) => {
  imageMenuVisible.value = false

  if (key === 'addLink') {
    // Insert image markdown with placeholder URL using editor insert API
    if (editorRef.value) {
      editorRef.value.insert((selectedText: string) => ({
        targetValue: `![${selectedText || 'image'}](url)`,
        select: true,
        deviationStart: 0,
        deviationEnd: 0
      }))
    }
  } else if (key === 'uploadImage') {
    // Show upload modal
    uploadModalRef.value?.show()
  } else if (key === 'selectImage') {
    // Show image selector modal
    imageSelectorRef.value?.show()
  }
}

// Load article content
const loadArticle = async () => {
  const slug = route.query.slug as string
  const topic = route.query.topic as string

  if (!slug || !topic) {
    message.error('缺少必要参数')
    return
  }

  loading.value = true
  try {
    // Get topic details to find article info
    const topicData = await topicApi.getTopicDetail(topic)
    topicSlug.value = topicData.slug
    articleSlug.value = slug

    // Verify article exists in topic
    let found = false
    for (const chapter of topicData.chapters || []) {
      const article = chapter.articles?.find(
        (a: { slug: string; title?: string }) => a.slug === slug
      )
      if (article) {
        found = true
        // Set document title
        document.title = `编辑: ${article.title} - Mind Palace`
        break
      }
    }

    if (!found) {
      message.error('文章不存在')
      return
    }

    // Load article content
    const data = await articleApi.getArticleContent(topicSlug.value, articleSlug.value)
    const rawContent = data.content || ''
    content.value = rawContent

    // Parse frontmatter
    const frontmatterMatch = rawContent.match(/^---\n([\s\S]*?)\n---\n/)
    if (frontmatterMatch) {
      frontmatterContent.value = frontmatterMatch[0]
      displayContent.value = rawContent.substring(frontmatterMatch[0].length)
    } else {
      frontmatterContent.value = ''
      displayContent.value = rawContent
    }
  } catch (error) {
    console.error('加载文章失败:', error)
    message.error('加载文章失败')
  } finally {
    loading.value = false
  }
}

// Handle image upload (triggered by paste or drag-drop)
const handleUploadImg = async (files: File[], callback: (urls: string[]) => void) => {
  // Store callback for after upload completes
  pendingUploadCallback.value = callback

  // Show upload modal with the pasted/dropped files
  uploadModalRef.value?.show(files)

  // Note: The actual upload will be handled by UploadModal
  // After upload success, handleUploadSuccess will be called
}

// Handle upload success from upload modal
const handleUploadSuccess = (imageInfos: Array<{ path: string; name: string }>) => {
  // Use path instead of url (ImageInfo interface uses 'path')
  const urls = imageInfos.map(info => info.path)

  // If triggered by paste/drop, use the stored callback
  if (pendingUploadCallback.value) {
    pendingUploadCallback.value(urls)
    pendingUploadCallback.value = null
  } else if (editorRef.value) {
    // If triggered by custom toolbar button, use editor insert API
    const url = urls[0]
    editorRef.value.insert((selectedText: string) => ({
      targetValue: `![${selectedText || 'image'}](${url})`,
      select: false,
      deviationStart: 0,
      deviationEnd: 0
    }))
  } else {
    // Fallback: insert directly
    urls.forEach(url => {
      insertImageToEditor(url)
    })
  }
}

// Insert image markdown syntax to editor
const insertImageToEditor = (url: string) => {
  const currentContent = displayContent.value
  const imageMarkdown = `![image](${url})\n`

  // Append image to current cursor position or end of content
  displayContent.value = currentContent + imageMarkdown
}

// Handle image selection from selector modal
const handleImageSelect = (imageUrl: string) => {
  if (pendingImageCallback.value) {
    pendingImageCallback.value(imageUrl)
    pendingImageCallback.value = null
  } else if (editorRef.value) {
    // If triggered by custom toolbar button, use editor insert API
    editorRef.value.insert((selectedText: string) => ({
      targetValue: `![${selectedText || 'image'}](${imageUrl})`,
      select: false,
      deviationStart: 0,
      deviationEnd: 0
    }))
  }
}

// Handle content change in editor
const handleContentChange = (newContent: string) => {
  displayContent.value = newContent
  // Combine frontmatter with edited content
  content.value = frontmatterContent.value + newContent
}

// Handle save (triggered by editor save button or Ctrl+S)
const handleSave = async () => {
  if (!topicSlug.value || !articleSlug.value) {
    message.error('缺少必要参数')
    return
  }

  try {
    // Ensure content includes frontmatter
    const fullContent = frontmatterContent.value + displayContent.value

    await articleApi.updateArticleContent(topicSlug.value, articleSlug.value, fullContent)
  } catch (error) {
    console.error('保存文章失败:', error)
    message.error(error instanceof Error ? error.message : '保存失败')
  }
}

// Calculate editor height based on container size
const calculateEditorHeight = () => {
  if (editorContainerRef.value) {
    const height = editorContainerRef.value.clientHeight
    if (height > 0) {
      editorHeight.value = height
    }
  }
}

// Handle window resize
const handleResize = () => {
  calculateEditorHeight()
}

onMounted(async () => {
  // Load article content
  loadArticle()

  // Wait for DOM to be ready
  await nextTick()

  // Calculate height with multiple retries
  let retryCount = 0
  const maxRetries = 10

  const tryCalculateHeight = () => {
    calculateEditorHeight()

    if (editorHeight.value === 0 && retryCount < maxRetries) {
      retryCount++
      setTimeout(tryCalculateHeight, 50)
    } else if (editorHeight.value > 0) {
      // Setup image button interception after editor is ready
      setTimeout(() => {
        setupImageButtonInterception()
      }, 200)
    }
  }

  tryCalculateHeight()

  // Add resize listener
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.article-edit {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  z-index: 1000;
}

.article-edit :deep(.ant-spin-nested-loading),
.article-edit :deep(.ant-spin-container) {
  height: 100%;
}

/* VitePress preview styles */
.article-edit :deep(.md-editor-preview-wrapper) {
  padding: 20px 24px;
}

.article-edit :deep(.vp-doc) {
  /* Match VitePress document styles */
  max-width: 688px;
  margin: 0 auto;
}

.article-edit :deep(.vp-doc h1) {
  margin-top: 24px;
  font-size: 32px;
  font-weight: 600;
  line-height: 40px;
  letter-spacing: -0.02em;
}

.article-edit :deep(.vp-doc h2) {
  margin: 48px 0 16px;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 24px;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
  letter-spacing: -0.02em;
}

.article-edit :deep(.vp-doc h3) {
  margin: 32px 0 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  letter-spacing: -0.01em;
}

.article-edit :deep(.vp-doc p) {
  margin: 16px 0;
  line-height: 28px;
}

.article-edit :deep(.vp-doc a) {
  color: var(--vp-c-brand);
  text-decoration: none;
  transition: color 0.25s;
}

.article-edit :deep(.vp-doc a:hover) {
  color: var(--vp-c-brand-light);
}

.article-edit :deep(.vp-doc code) {
  padding: 3px 6px;
  font-size: 0.875em;
  background-color: var(--vp-c-bg-mute);
  border-radius: 4px;
}

.article-edit :deep(.vp-doc pre) {
  margin: 16px 0;
  padding: 16px;
  overflow-x: auto;
  background-color: var(--vp-code-block-bg);
  border-radius: 8px;
}

.article-edit :deep(.vp-doc pre code) {
  padding: 0;
  background-color: transparent;
}

.article-edit :deep(.vp-doc ul),
.article-edit :deep(.vp-doc ol) {
  padding-left: 1.25rem;
  margin: 16px 0;
}

.article-edit :deep(.vp-doc li) {
  margin-top: 8px;
  line-height: 28px;
}

.article-edit :deep(.vp-doc blockquote) {
  margin: 16px 0;
  border-left: 2px solid var(--vp-c-divider);
  padding-left: 16px;
  color: var(--vp-c-text-2);
}

.article-edit :deep(.vp-doc table) {
  display: block;
  border-collapse: collapse;
  margin: 20px 0;
  overflow-x: auto;
}

.article-edit :deep(.vp-doc tr) {
  border-top: 1px solid var(--vp-c-divider);
}

.article-edit :deep(.vp-doc th),
.article-edit :deep(.vp-doc td) {
  border: 1px solid var(--vp-c-divider);
  padding: 8px 16px;
}

.article-edit :deep(.vp-doc th) {
  font-weight: 600;
  background-color: var(--vp-c-bg-soft);
}

.article-edit :deep(.vp-doc img) {
  max-width: 100%;
  border-radius: 8px;
}

/* Custom toolbar button styles */
.article-edit :deep(.md-editor-toolbar-item) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.article-edit :deep(.md-editor-toolbar-item svg),
.article-edit :deep(.md-editor-toolbar-item .anticon) {
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Custom image trigger - invisible overlay */
.custom-image-trigger {
  pointer-events: auto;
  cursor: pointer;
}
</style>
