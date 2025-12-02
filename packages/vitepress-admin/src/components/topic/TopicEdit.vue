<template>
  <div class="topic-edit">
    <template v-if="route.query.topic">
      <a-spin :spinning="loading">
        <div class="content-wrapper">
          <!-- 左侧专题配置 -->
          <div class="left-panel">
            <div class="section-title">
              <span>专题配置</span>
              <div class="title-actions">
                <a-button type="primary" size="small" @click="saveTopic" :disabled="!hasChanges"
                  >保存</a-button
                >
              </div>
            </div>

            <div class="panel-content">
              <a-form layout="vertical">
                <a-form-item
                  label="专题名称"
                  required
                  :validate-status="topicNameError ? 'error' : ''"
                  :help="topicNameError"
                >
                  <a-input
                    v-model:value="topicData.name"
                    placeholder="请输入专题名称"
                    @change="validateTopicName"
                  />
                </a-form-item>

                <a-form-item
                  label="专题标识"
                  required
                  :validate-status="topicSlugError ? 'error' : ''"
                  :help="topicSlugError"
                >
                  <a-input v-model:value="topicData.slug" placeholder="请输入专题标识" disabled />
                </a-form-item>

                <a-form-item label="专题描述">
                  <a-textarea
                    v-model:value="topicData.description"
                    placeholder="请输入专题描述"
                    :auto-size="{ minRows: 3, maxRows: 5 }"
                  />
                </a-form-item>

                <a-form-item label="专题图标">
                  <image-uploader
                    v-model="topicData.image"
                    :allow-storage-switch="true"
                    :storage-type="'local'"
                    :upload-path="'images/topics'"
                    width="104px"
                    height="104px"
                  />
                </a-form-item>
              </a-form>
            </div>
          </div>

          <!-- 右侧章节管理 -->
          <div class="right-panel">
            <div class="section-title">
              文章配置
              <a-button type="primary" size="small" @click="handleAddChapter">
                <PlusOutlined />添加章节
              </a-button>
            </div>

            <div class="chapters-grid">
              <draggable
                v-model="chapters"
                class="chapters-container"
                handle=".chapter-drag-handle"
                :group="{ name: 'chapters' }"
                item-key="id"
                @change="handleChaptersChange"
              >
                <template #item="{ element: chapter, index }">
                  <div class="chapter-wrapper">
                    <a-card
                      class="chapter-card"
                      :class="{ 'chapter-card-active': selectedChapter?.id === chapter.id }"
                    >
                      <template #title>
                        <div class="chapter-card-header">
                          <a-button
                            type="text"
                            danger
                            size="small"
                            @click.stop="handleRemoveChapter(chapter)"
                          >
                            <DeleteOutlined />
                          </a-button>
                          <span class="chapter-title" @click="selectChapter(chapter)">
                            第{{ index + 1 }}章 {{ chapter.title || '未命名章节' }}
                          </span>
                          <a-button
                            type="text"
                            size="small"
                            @click.stop="handleChapterTitleEdit(chapter)"
                          >
                            <EditOutlined />
                          </a-button>
                          <MenuOutlined class="chapter-drag-handle" />
                        </div>
                      </template>
                      <div class="chapter-card-content">
                        <div class="chapter-stats">
                          {{ chapter.articles.length }} 篇文章
                          <a-button
                            type="link"
                            size="small"
                            @click.stop="toggleChapterExpand(chapter)"
                          >
                            <DownOutlined v-if="!chapter.expanded" />
                            <UpOutlined v-else />
                            {{ chapter.expanded ? '收起' : '展开' }}
                          </a-button>
                        </div>
                        <draggable
                          v-model="chapter.articles"
                          class="articles-list"
                          :class="{ 'articles-list-expanded': chapter.expanded }"
                          handle=".article-drag-handle"
                          :group="{ name: 'articles', pull: true, put: true }"
                          item-key="id"
                          @change="handleArticlesChange"
                        >
                          <template #item="{ element: article, index: articleIndex }">
                            <div class="article-wrapper">
                              <div class="article-item">
                                <MenuOutlined class="article-drag-handle" />
                                <a-form-item
                                  v-if="article.editing"
                                  class="article-title-form-item"
                                  required
                                  :validate-status="article.titleError ? 'error' : ''"
                                  :help="article.titleError"
                                >
                                  <a-input
                                    v-model:value="article.title"
                                    size="small"
                                    class="article-title-input"
                                    @pressEnter="handleArticleTitleSave(article)"
                                    @blur="handleArticleTitleSave(article)"
                                    ref="articleTitleInput"
                                    @click.stop
                                  />
                                </a-form-item>
                                <span
                                  v-else
                                  class="article-title"
                                  :class="{ 'article-error': hasArticleError(article) }"
                                  @dblclick.stop="handleArticleTitleEdit(article)"
                                >
                                  {{
                                    `${chapters.findIndex(c => c.id === chapter.id) + 1}.${articleIndex + 1}`
                                  }}
                                  {{ article.title || '未命名文章' }}
                                  <a-tooltip
                                    v-if="hasArticleError(article)"
                                    :title="getArticleError(article)"
                                  >
                                    <ExclamationCircleOutlined class="error-icon" />
                                  </a-tooltip>
                                </span>
                                <div class="article-actions">
                                  <a-button
                                    type="text"
                                    size="small"
                                    @click.stop="handleArticleTitleEdit(article)"
                                  >
                                    <EditOutlined />
                                  </a-button>
                                  <a-button
                                    type="text"
                                    danger
                                    size="small"
                                    @click.stop="handleRemoveArticle(chapter, article)"
                                  >
                                    <DeleteOutlined />
                                  </a-button>
                                </div>
                              </div>
                              <div class="article-slug-row">
                                <a-input
                                  v-if="article.slugEditing"
                                  v-model:value="article.slug"
                                  size="small"
                                  class="article-slug-input"
                                  @pressEnter="handleArticleSlugSave(article)"
                                  @blur="handleArticleSlugSave(article)"
                                  ref="articleSlugInput"
                                  @click.stop
                                />
                                <div
                                  v-else
                                  class="article-slug"
                                  :class="{ 'article-error': hasArticleSlugError(article) }"
                                  @dblclick.stop="handleArticleSlugEdit(article)"
                                >
                                  <LinkOutlined class="slug-icon" />
                                  <span class="slug-text" @click="handleArticleSlugEdit(article)">{{
                                    article.slug || '未设置标识'
                                  }}</span>
                                  <EditOutlined
                                    class="edit-icon"
                                    @click.stop="handleArticleSlugEdit(article)"
                                  />
                                </div>
                              </div>
                            </div>
                          </template>
                        </draggable>
                        <div class="add-article-btn-wrapper" @click.stop>
                          <a-button type="link" block @click="handleAddArticle(chapter)">
                            <PlusOutlined /> 添加文章
                          </a-button>
                        </div>
                      </div>
                    </a-card>
                  </div>
                </template>
              </draggable>
            </div>
          </div>
        </div>

        <!-- 抽屉部分 -->
        <a-drawer
          v-model:open="drawerVisible"
          :title="drawerTitle"
          placement="right"
          width="720"
          @close="closeDrawer"
        >
          <template v-if="selectedChapter">
            <div class="chapter-form">
              <a-form layout="horizontal" :class="['compact-form']">
                <div class="form-row">
                  <a-form-item label="章节标题" class="title-item" required>
                    <a-input
                      v-model:value="selectedChapter.title"
                      placeholder="请输入章节标题"
                      size="small"
                    />
                  </a-form-item>
                  <a-form-item label="章节描述" class="desc-item">
                    <a-textarea
                      v-model:value="selectedChapter.description"
                      placeholder="请输入章节描述"
                      :auto-size="{ minRows: 1, maxRows: 2 }"
                      size="small"
                    />
                  </a-form-item>
                </div>
                <a-divider style="margin: 12px 0">
                  文章列表
                  <a-button type="link" size="small" @click="handleAddArticle(selectedChapter)">
                    <PlusOutlined /> 添加文章
                  </a-button>
                </a-divider>
                <!-- 抽屉部分的文章列表 -->
                <div class="drawer-articles-list">
                  <draggable
                    v-model="selectedChapter.articles"
                    class="drawer-articles-container"
                    handle=".drawer-article-drag-handle"
                    :group="{ name: 'articles' }"
                    item-key="id"
                    @change="handleArticlesChange"
                  >
                    <template #item="{ element: article }">
                      <div class="drawer-article-item">
                        <div class="article-content">
                          <div class="article-header">
                            <MenuOutlined class="drawer-article-drag-handle" />
                            <div class="article-main-row">
                              <a-form-item
                                class="article-title-form-item"
                                required
                                label="标题"
                                :validate-status="article.titleError ? 'error' : ''"
                                :help="article.titleError"
                              >
                                <a-input
                                  v-model:value="article.title"
                                  placeholder="请输入文章标题"
                                  class="article-title-input"
                                  size="small"
                                />
                              </a-form-item>
                              <a-form-item
                                class="article-slug-form-item"
                                required
                                label="标识"
                                :validate-status="article.slugError ? 'error' : ''"
                                :help="article.slugError"
                              >
                                <a-input
                                  v-model:value="article.slug"
                                  placeholder="请输入文章标识"
                                  class="article-slug-input"
                                  size="small"
                                />
                              </a-form-item>
                            </div>
                            <a-button
                              type="text"
                              danger
                              size="small"
                              @click="handleRemoveArticle(selectedChapter, article)"
                            >
                              <DeleteOutlined />
                            </a-button>
                          </div>
                          <div class="article-content-row">
                            <div class="article-summary-wrapper">
                              <a-form-item class="article-summary-form-item" label="摘要">
                                <a-textarea
                                  v-model:value="article.summary"
                                  placeholder="请输入文章摘要"
                                  :auto-size="{ minRows: 1, maxRows: 3 }"
                                  size="small"
                                  class="article-summary-input"
                                />
                              </a-form-item>
                            </div>
                            <a-form-item class="article-status-form-item" label="状态">
                              <a-select
                                v-model:value="article.status"
                                class="article-status-select"
                                size="small"
                              >
                                <a-select-option value="planned">
                                  <CalendarOutlined style="color: #1890ff" /> 计划中
                                </a-select-option>
                                <a-select-option value="draft">
                                  <ClockCircleOutlined style="color: #faad14" /> 草稿
                                </a-select-option>
                                <a-select-option value="completed">
                                  <CheckCircleOutlined style="color: #52c41a" /> 已完成
                                </a-select-option>
                              </a-select>
                            </a-form-item>
                          </div>
                        </div>
                      </div>
                    </template>
                  </draggable>
                </div>
              </a-form>
            </div>
          </template>
          <template #footer>
            <a-button type="primary" @click="saveAndClose">保存并关闭</a-button>
          </template>
        </a-drawer>
      </a-spin>
    </template>
    <div v-else class="empty-state">
      <a-empty description="请选择一个专题进行编辑">
        <template #extra>
          <a-button type="primary" @click="$emit('add-topic')"> <PlusOutlined />添加专题 </a-button>
        </template>
      </a-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import draggable from 'vuedraggable'
import emitter from '@/utils/eventBus'
import { API_BASE_URL } from '@/config'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MenuOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DownOutlined,
  UpOutlined,
  ExclamationCircleOutlined,
  LinkOutlined
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { h } from 'vue'
import ImageUploader from '@/components/common/ImageUploader.vue'

interface Article {
  id: string
  title: string
  slug: string
  summary: string
  status: 'draft' | 'completed' | 'planned'
  editing?: boolean
  titleError?: string
  slugError?: string
  slugEditing?: boolean
}

interface Chapter {
  id: string
  title: string
  description: string
  articles: Article[]
  expanded?: boolean
}

interface TopicData {
  id: string
  name: string
  slug: string
  description: string
  image: string
  chapters: Chapter[]
}

const route = useRoute()
const chapters = ref<Chapter[]>([])
const loading = ref(false)
const selectedChapter = ref<Chapter | null>(null)
const drawerVisible = ref(false)
const topicData = ref<TopicData>({
  id: '',
  name: '',
  slug: '',
  description: '',
  image: '',
  chapters: []
})

// 保存原始数据的副本
const originalData = ref<TopicData | null>(null)

// 检查是否有修改
const hasChanges = computed(() => {
  if (!originalData.value || !topicData.value) return false

  // 创建不包含临时数据和UI状态的数据副本用于比较
  const cleanOriginalData = {
    ...originalData.value,
    chapters: originalData.value.chapters.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      articles: chapter.articles.map(article => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        status: article.status
      }))
    }))
  }

  const cleanCurrentData = {
    ...topicData.value,
    chapters: chapters.value.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      articles: chapter.articles.map(article => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        status: article.status
      }))
    }))
  }

  // 深度比较两个对象
  const compareObjects = (obj1: unknown, obj2: unknown): boolean => {
    if (obj1 === obj2) return false
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 !== obj2
    if (obj1 === null || obj2 === null) return obj1 !== obj2

    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)

    if (keys1.length !== keys2.length) return true

    for (const key of keys1) {
      if (!Object.prototype.hasOwnProperty.call(obj2, key)) return true
      const val1 = (obj1 as Record<string, unknown>)[key]
      const val2 = (obj2 as Record<string, unknown>)[key]
      if (Array.isArray(val1)) {
        if (!Array.isArray(val2)) return true
        if (val1.length !== val2.length) return true
        for (let i = 0; i < val1.length; i++) {
          if (compareObjects(val1[i], val2[i])) return true
        }
      } else if (typeof val1 === 'object' && val1 !== null) {
        if (compareObjects(val1, val2)) return true
      } else if (val1 !== val2) {
        return true
      }
    }
    return false
  }

  return compareObjects(cleanOriginalData, cleanCurrentData)
})

// 修改 loadTopicData 方法
const loadTopicData = async () => {
  const topicId = route.query.topic as string
  if (!topicId) return

  loading.value = true
  try {
    console.log('Loading topic data for:', topicId) // 添加日志
    const response = await fetch(`${API_BASE_URL}/topic/${topicId}`)
    if (!response.ok) {
      throw new Error('加载失败')
    }
    const result = await response.json()
    const data = result.data || result // 兼容新旧响应格式
    console.log('Loaded topic data:', data) // 添加日志
    topicData.value = data
    // 保存原始数据的深拷贝
    originalData.value = JSON.parse(JSON.stringify(data))
    chapters.value = (data.chapters || []).map((chapter: Chapter) => ({
      ...chapter,
      expanded: false // 默认收起所有章节
    }))
  } catch (error) {
    console.error('加载专题数据失败:', error)
    message.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 监听路由参数变化
watch(
  () => route.query.topic,
  async newTopicId => {
    console.log('Topic ID changed:', newTopicId) // 添加日志
    if (newTopicId) {
      await loadTopicData()
    } else {
      // 清空数据
      topicData.value = {
        id: '',
        name: '',
        slug: '',
        description: '',
        image: '',
        chapters: []
      }
      chapters.value = []
    }
  },
  { immediate: true }
)

// 在 script 部分添加
const topicNameError = ref<string>('')
const topicSlugError = ref<string>('')

// 校验专题名称
const validateTopicName = () => {
  const name = topicData.value.name?.trim()
  if (!name) {
    topicNameError.value = '专题名称不能为空'
  } else {
    topicNameError.value = ''
  }
}

// 移除 validateTopicSlug 函数

// 监听专题名称和标识的变化
watch(
  () => topicData.value.name,
  () => {
    validateTopicName()
  },
  { immediate: true }
)

// 初始加载
onMounted(() => {
  if (route.query.topic) {
    loadTopicData()
  }
})

// 修改原有的 validateData 函数
const validateData = () => {
  const errors: string[] = []

  // 校验专题基本信息
  const name = topicData.value.name?.trim()

  if (!name) {
    errors.push('专题名称不能为空')
  }

  // 用于检查重复的集合
  const titleSet = new Set<string>()
  const slugSet = new Set<string>()
  const duplicateTitles = new Set<string>()
  const duplicateSlugs = new Set<string>()

  // 校验章节和文章
  chapters.value.forEach((chapter, chapterIndex) => {
    if (!chapter.title?.trim()) {
      errors.push(`第${chapterIndex + 1}章的标题不能为空`)
    }

    chapter.articles.forEach((article, articleIndex) => {
      const articlePosition = `第${chapterIndex + 1}章第${articleIndex + 1}篇文章`
      const title = article.title?.trim()
      const slug = article.slug?.trim()

      // 检查标题
      if (!title) {
        errors.push(`${articlePosition}的标题不能为空`)
      } else {
        if (titleSet.has(title)) {
          duplicateTitles.add(title)
        } else {
          titleSet.add(title)
        }
      }

      // 检查标识
      if (!slug) {
        errors.push(`${articlePosition}的标识不能为空`)
      } else {
        if (slugSet.has(slug)) {
          duplicateSlugs.add(slug)
        } else {
          slugSet.add(slug)
        }
      }
    })
  })

  // 添加重复项的错误信息
  duplicateTitles.forEach(title => {
    errors.push(`文章标题"${title}"在专题中重复`)
  })
  duplicateSlugs.forEach(slug => {
    errors.push(`文章标识"${slug}"在专题中重复`)
  })

  return errors
}

// 实时校验单个文章的标题和标识是否重复
const validateArticle = (
  article: Article,
  _unusedParam?: string
): { titleError?: string; slugError?: string } => {
  const errors: { titleError?: string; slugError?: string } = {}
  const title = article.title?.trim()
  const slug = article.slug?.trim()

  if (title) {
    let found = false
    for (const chapter of chapters.value) {
      for (const a of chapter.articles) {
        if (a.id !== article.id && a.title?.trim() === title) {
          found = true
          break
        }
      }
      if (found) break
    }
    if (found) {
      errors.titleError = '文章标题已存在'
    }
  }

  if (slug) {
    let found = false
    for (const chapter of chapters.value) {
      for (const a of chapter.articles) {
        if (a.id !== article.id && a.slug?.trim() === slug) {
          found = true
          break
        }
      }
      if (found) break
    }
    if (found) {
      errors.slugError = '文章标识已存在'
    }
  }

  return errors
}

// 监听所有文章的变化
watch(
  () => chapters.value,
  () => {
    // 为所有章节的所有文章设置校验
    chapters.value.forEach(chapter => {
      chapter.articles.forEach(article => {
        const errors = validateArticle(article)
        article.titleError = errors.titleError
        article.slugError = errors.slugError
      })
    })
  },
  { deep: true }
)

// 在抽屉中展示文章时设置监听
const selectChapter = (chapter: Chapter) => {
  selectedChapter.value = chapter
  drawerVisible.value = true
}

// 添加文章时设置监听
const handleAddArticle = (chapter: Chapter) => {
  const newArticle: Article = {
    id: Date.now().toString(),
    title: '',
    slug: '',
    summary: '',
    status: 'planned'
  }
  chapter.articles.push(newArticle)
  handleArticlesChange() // 这里会触发校验
}

const handleChaptersChange = () => {
  if (topicData.value) {
    // 使用解构赋值来确保触发响应式更新
    topicData.value = {
      ...topicData.value,
      chapters: JSON.parse(JSON.stringify(chapters.value))
    }
  }
}

// 修改 handleArticlesChange 函数
const handleArticlesChange = () => {
  if (topicData.value) {
    // 使用解构赋值来确保触发响应式更新
    topicData.value = {
      ...topicData.value,
      chapters: JSON.parse(JSON.stringify(chapters.value))
    }

    // 为所有文章进行校验
    chapters.value.forEach(chapter => {
      chapter.articles.forEach(article => {
        const errors = validateArticle(article)
        article.titleError = errors.titleError
        article.slugError = errors.slugError
      })
    })
  }
}

// 展开/收起章节
const toggleChapterExpand = (chapter: Chapter) => {
  chapter.expanded = !chapter.expanded
}

// 删除章节
const handleRemoveChapter = (chapter: Chapter) => {
  // 如果章节没有文章，直接删除
  if (chapter.articles.length === 0) {
    const index = chapters.value.findIndex(c => c.id === chapter.id)
    if (index > -1) {
      chapters.value.splice(index, 1)
      if (selectedChapter.value?.id === chapter.id) {
        closeDrawer()
      }
      message.success('删除成功')
    }
    return
  }

  // 如果有文章，需要二次确认
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除该章节吗？章节内的所有文章也会被删除。',
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      const index = chapters.value.findIndex(c => c.id === chapter.id)
      if (index > -1) {
        chapters.value.splice(index, 1)
        if (selectedChapter.value?.id === chapter.id) {
          closeDrawer()
        }
        message.success('删除成功')
      }
    }
  })
}

// 删除文章
const handleRemoveArticle = (chapter: Chapter, article: Article) => {
  // 如果是未命名文章，直接删除
  if (!article.title || article.title === '未命名文章') {
    const index = chapter.articles.findIndex(a => a.id === article.id)
    if (index > -1) {
      chapter.articles.splice(index, 1)
      message.success('删除成功')
    }
    return
  }

  // 其他文章需要确认
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除该文章吗？',
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      const index = chapter.articles.findIndex(a => a.id === article.id)
      if (index > -1) {
        chapter.articles.splice(index, 1)
        message.success('删除成功')
      }
    }
  })
}

// 编辑文章标题
const handleArticleTitleEdit = (article: Article) => {
  article.editing = true
  // 等待 DOM 更新后聚焦输入框
  nextTick(() => {
    const input = document.querySelector('.article-title-input') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  })
}

// 保存文章标题
const handleArticleTitleSave = (article: Article) => {
  article.editing = false
  if (!article.title.trim()) {
    article.title = '未命名文章'
  }
}

// 在抽屉中编辑文章标识
const handleArticleSlugEdit = (article: Article) => {
  article.slugEditing = true
  // 等待 DOM 更新后聚焦输入框
  nextTick(() => {
    const input = document.querySelector('.article-slug-input') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  })
}

// 保存文章标识
const handleArticleSlugSave = (article: Article) => {
  article.slugEditing = false
  if (!article.slug?.trim()) {
    article.slug = '未设置标识'
  }
  // 触发校验
  const errors = validateArticle(article)
  article.slugError = errors.slugError
}

// 点击空白处关闭编辑框
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.article-title-input') && !target.closest('.article-slug-input')) {
    chapters.value.forEach(chapter => {
      chapter.articles.forEach(article => {
        if (article.editing) {
          handleArticleTitleSave(article)
        }
        if (article.slugEditing) {
          handleArticleSlugSave(article)
        }
      })
    })
  }
}

// 修改事件监听
onMounted(() => {
  document.addEventListener('click', handleClickOutside)

  // 添加专题更新事件监听
  emitter.on('topic-updated', async (topicId: string) => {
    if (topicId === route.query.topic) {
      await loadTopicData()
    }
  })
})

// 移除点击事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  // 移除专题更新事件监听
  emitter.off('topic-updated')
})

const closeDrawer = () => {
  drawerVisible.value = false
  selectedChapter.value = null
}

// 修改保存专题的方法
const saveTopic = async () => {
  if (!hasChanges.value) return

  // 执行数据校验
  const errors = validateData()
  if (errors.length > 0) {
    Modal.error({
      title: '保存失败',
      content: h(
        'div',
        {
          style: {
            maxHeight: '300px',
            overflow: 'auto'
          }
        },
        [
          h('div', { style: { marginBottom: '8px' } }, '请修正以下错误：'),
          ...errors.map(error =>
            h(
              'div',
              {
                style: {
                  marginLeft: '8px',
                  lineHeight: '24px',
                  display: 'flex',
                  alignItems: 'flex-start'
                }
              },
              [h('span', { style: { marginRight: '8px' } }, '•'), h('span', {}, error)]
            )
          )
        ]
      )
    })
    return
  }

  loading.value = true
  try {
    // 创建一个不包含UI状态属性的数据副本
    const saveData = {
      ...topicData.value,
      chapters: chapters.value.map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        articles: chapter.articles.map(article => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          status: article.status
        }))
      }))
    }

    const topicId = route.query.topic as string
    const response = await fetch(`${API_BASE_URL}/topic/${topicId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saveData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知错误' }))
      throw new Error(errorData.error || `保存失败 (${response.status})`)
    }

    const result = await response.json()

    // 保存成功后更新原始数据
    originalData.value = JSON.parse(JSON.stringify(saveData))

    // 显示成功消息
    if (result.message) {
      message.success(result.message)
    } else {
      message.success('保存成功')
    }

    // 重新加载数据以确保显示最新状态
    await loadTopicData()
  } catch (error) {
    console.error('保存失败:', error)
    message.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    loading.value = false
  }
}

const handleAddChapter = () => {
  const newChapter = {
    id: Date.now().toString(),
    title: '未命名章节',
    description: '',
    articles: [],
    expanded: true // 新增章节默认展开
  }
  chapters.value.push(newChapter)
  // 手动触发变更
  handleChaptersChange()
}

const saveAndClose = async () => {
  // 执行数据校验
  const errors = validateData()
  if (errors.length > 0) {
    Modal.error({
      title: '保存失败',
      content: h(
        'div',
        {
          style: {
            maxHeight: '300px',
            overflow: 'auto'
          }
        },
        [
          h('div', { style: { marginBottom: '8px' } }, '请修正以下错误：'),
          ...errors.map(error =>
            h(
              'div',
              {
                style: {
                  marginLeft: '8px',
                  lineHeight: '24px',
                  display: 'flex',
                  alignItems: 'flex-start'
                }
              },
              [h('span', { style: { marginRight: '8px' } }, '•'), h('span', {}, error)]
            )
          )
        ]
      )
    })
    return
  }

  try {
    await saveTopic()
    closeDrawer()
  } catch {
    // Error already handled in saveTopic
  }
}

// 计算抽屉标题
const drawerTitle = computed(() => {
  if (!selectedChapter.value) return ''
  const chapterIndex = chapters.value.findIndex(c => c.id === selectedChapter.value?.id) + 1
  return `第${chapterIndex}章 ${selectedChapter.value.title || '未命名章节'}`
})

// 检查文章是否有错误
const hasArticleError = (article: Article) => {
  // 检查标题和标识是否为空
  if (!article.title?.trim() || !article.slug?.trim()) {
    return true
  }

  // 检查标题和标识是否重复
  let titleDuplicate = false
  let slugDuplicate = false

  for (const chapter of chapters.value) {
    for (const a of chapter.articles) {
      if (a.id !== article.id) {
        if (a.title?.trim() === article.title?.trim()) {
          titleDuplicate = true
        }
        if (a.slug?.trim() === article.slug?.trim()) {
          slugDuplicate = true
        }
      }
    }
  }

  return titleDuplicate || slugDuplicate
}

// 获取文章的错误信息
const getArticleError = (article: Article): string => {
  const errors: string[] = []

  if (!article.title?.trim()) {
    errors.push('标题不能为空')
  }
  if (!article.slug?.trim()) {
    errors.push('标识不能为空')
  }

  // 检查重复
  for (const chapter of chapters.value) {
    for (const a of chapter.articles) {
      if (a.id !== article.id) {
        if (a.title?.trim() === article.title?.trim()) {
          errors.push('标题重复')
          break
        }
      }
    }
  }

  for (const chapter of chapters.value) {
    for (const a of chapter.articles) {
      if (a.id !== article.id) {
        if (a.slug?.trim() === article.slug?.trim()) {
          errors.push('标识重复')
          break
        }
      }
    }
  }

  return errors.join('、')
}

// 检查文章标识是否有错误
const hasArticleSlugError = (article: Article): boolean => {
  if (!article.slug?.trim()) return true

  // 检查标识是否重复
  for (const chapter of chapters.value) {
    for (const a of chapter.articles) {
      if (a.id !== article.id && a.slug?.trim() === article.slug?.trim()) {
        return true
      }
    }
  }
  return false
}

// 添加章节标题编辑相关的状态和方法
const handleChapterTitleEdit = (chapter: Chapter) => {
  // 打开抽屉并选中章节
  selectedChapter.value = chapter
  drawerVisible.value = true

  // 聚焦到标题输入框
  nextTick(() => {
    const input = document.querySelector('.ant-drawer .ant-input') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  })
}
</script>

<style scoped>
.topic-edit {
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-wrapper {
  display: flex;
  flex: 1;
  padding: 24px;
  gap: 24px;
  overflow: hidden;
  height: 100%;
  min-height: 0;
}

.left-panel {
  flex: 0 0 260px;
  border-right: 1px solid #f0f0f0;
  padding-right: 24px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.section-title {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 500;
  color: #1f1f1f;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-bottom: 24px;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.chapters-grid {
  flex: 1;
  min-height: 0;
  position: relative;
}

.chapters-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  padding: 0 16px 24px 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  align-content: flex-start;
}

.chapter-wrapper {
  min-width: 0;
  height: 100%;
}

.chapter-card {
  height: 100%;
  min-height: 200px;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
}

.chapter-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chapter-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chapter-title {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: #1890ff;
  }
}

.chapter-drag-handle {
  cursor: move;
  color: #999;
  transition: color 0.3s;
  padding: 4px;
}

.chapter-card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow: hidden;
}

.chapter-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.chapter-stats {
  font-size: 14px;
  color: #666;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chapter-drag-handle,
.article-drag-handle {
  cursor: move;
  color: #999;
  transition: color 0.3s;
  padding: 4px;
}

.chapter-drag-handle:hover,
.article-drag-handle:hover {
  color: #1890ff;
}

.articles-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  margin: 8px 0;
  min-height: 0;
  max-height: none;
  transition: all 0.3s ease;
}

.articles-list-expanded {
  max-height: none;
}

.article-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: #fafafa;
  border-radius: 4px;
  font-size: 14px;
}

.article-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: default;
  user-select: none;
  padding: 1px 4px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background-color: #f5f5f5;
  }
}

.article-title-input {
  flex: 1;
  margin: 0;
  padding: 0;
}

.article-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.article-item:hover .article-actions {
  opacity: 1;
}

.add-chapter-btn {
  width: 100%;
  height: 160px;
}

.drawer-articles-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.drawer-article-item {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s;
}

.drawer-article-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.article-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.article-header {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  width: 100%;
}

.article-main-row {
  display: flex;
  gap: 16px;
  flex: 1;
  align-items: flex-start;
}

.article-content-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.article-summary-wrapper {
  flex: 1;
  min-width: 0; /* 防止flex子项溢出 */
}

.article-title-form-item {
  flex: 3;
  margin-bottom: 0;
}

.article-slug-form-item {
  flex: 2;
  margin-bottom: 0;
}

.article-summary-form-item {
  flex: 1;
  margin-bottom: 0;
  display: flex;
  align-items: flex-start;

  :deep(.ant-form-item-label) {
    flex: none;
    padding: 0 8px 0 0;
    line-height: 32px;
    > label {
      font-size: 14px;
      height: 32px;
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
  }
}

.article-summary-input {
  width: 100%;
  background-color: #fff;
}

.article-status-form-item {
  flex: 0 0 140px;
  margin-bottom: 0;
}

.article-status-select {
  width: 100%;
}

:deep(.ant-select-selector) {
  background-color: #fff !important;
}

.chapter-form {
  .compact-form {
    :deep(.ant-form-item) {
      margin-bottom: 12px;
    }

    :deep(.ant-form-item-label) {
      padding: 0 8px 0 0;
      line-height: 32px;
      white-space: nowrap;
      > label {
        font-size: 14px;
        height: 32px;
      }
    }
  }
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 4px;
}

.title-item {
  flex: 0 0 300px;
  display: flex;
  align-items: center;
  margin-bottom: 0;

  :deep(.ant-form-item-label) {
    flex: none;
  }

  :deep(.ant-form-item-control) {
    flex: 1;
  }
}

.desc-item {
  flex: 1;
  display: flex;
  align-items: center;
  margin-bottom: 0;

  :deep(.ant-form-item-label) {
    flex: none;
  }

  :deep(.ant-form-item-control) {
    flex: 1;
  }
}

:deep(.ant-divider) {
  margin: 12px 0;
  font-size: 14px;
}

.drawer-articles-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.drawer-article-drag-handle {
  cursor: move;
  color: #999;
  padding: 4px 8px;
  margin-right: 4px;
  transition: color 0.3s;

  &:hover {
    color: #1890ff;
  }
}

.article-header {
  display: flex;
  gap: 8px;
  align-items: center;

  .article-title-input {
    flex: 1;
  }
}

.add-article-btn-wrapper {
  margin-top: 8px;
}

.add-article-btn-wrapper :deep(.ant-btn) {
  height: 32px;
  border: 1px dashed #d9d9d9;

  &:hover {
    border-color: #1890ff;
    color: #1890ff;
  }
}

.article-title-form-item,
.article-slug-form-item {
  flex: 1;
  margin-bottom: 12px;
  display: flex;
  align-items: center;

  :deep(.ant-form-item-label) {
    flex: none;
    padding: 0 8px 0 0;
    line-height: 32px;
    > label {
      font-size: 14px;
      height: 32px;
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
  }

  :deep(.ant-form-item-explain) {
    min-height: 24px;
    padding-top: 2px;
  }
}

.article-status-form-item {
  flex: 1;
  margin-bottom: 0;
  display: flex;
  align-items: center;

  :deep(.ant-form-item-label) {
    flex: none;
    padding: 0 8px 0 0;
    line-height: 32px;
    > label {
      font-size: 14px;
      height: 32px;
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
  }
}

.article-status-select {
  width: 100%;
}

:deep(.ant-form-item-label) {
  font-size: 14px;
}

:deep(.ant-form-item-required::before) {
  display: inline-block;
  margin-right: 4px;
  color: #ff4d4f;
  font-size: 14px;
  font-family: SimSun, sans-serif;
  line-height: 1;
  content: '*';
}

.article-error {
  color: #ff4d4f;
}

.error-icon {
  color: #ff4d4f;
  margin-left: 4px;
  font-size: 14px;
}

.article-slug-row {
  margin-top: 4px;
  padding-left: 24px;
}

.article-slug {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: #f5f5f5;

    .edit-icon {
      opacity: 1;
    }
  }

  &.article-error {
    color: #ff4d4f;
  }
}

.slug-icon {
  font-size: 12px;
  opacity: 0.7;
}

.slug-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-icon {
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s;
  color: #1890ff;
  cursor: pointer;
}

.article-slug-input {
  font-size: 12px;
  width: 100%;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
}
</style>
