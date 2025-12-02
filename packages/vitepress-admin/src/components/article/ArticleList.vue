<template>
  <div class="article-list">
    <div class="list-header">
      <div class="header-info">
        <h2>{{ topicTitle }}</h2>
        <span class="article-count">共 {{ totalArticles }} 篇文章</span>
      </div>
    </div>

    <div class="chapters-container">
      <a-spin :spinning="loading" class="loading-spin">
        <div v-if="!loading && totalArticles === 0" class="empty-placeholder">
          <a-empty description="该专题暂无文章" />
        </div>
        <div v-else class="chapters-grid">
          <div
            v-for="(chapter, chapterIndex) in chapters"
            :key="chapter.id"
            class="chapter-section"
          >
            <a-card class="chapter-card">
              <template #title>
                <div class="chapter-header">
                  <span class="chapter-title"
                    >第{{ chapterIndex + 1 }}章 {{ chapter.title || '未命名章节' }}</span
                  >
                  <span class="chapter-count">{{ chapter.articles.length }} 篇文章</span>
                </div>
              </template>
              <div class="articles-list">
                <div
                  v-for="(article, articleIndex) in chapter.articles"
                  :key="article.id"
                  class="article-item"
                  @click="handleArticleClick(article)"
                >
                  <div class="article-item-header">
                    <div class="article-number">{{ chapterIndex + 1 }}.{{ articleIndex + 1 }}</div>
                    <div class="article-item-content">
                      <div class="article-item-title">{{ article.title }}</div>
                      <p v-if="article.summary" class="article-item-summary">
                        {{ article.summary }}
                      </p>
                    </div>
                    <div class="article-item-status">
                      <a-tag v-if="article.status === 'completed'" color="success" size="small">
                        <CheckCircleOutlined /> 已完成
                      </a-tag>
                      <a-tag v-else-if="article.status === 'draft'" color="warning" size="small">
                        <ClockCircleOutlined /> 草稿
                      </a-tag>
                      <a-tag v-else color="default" size="small">
                        <CalendarOutlined /> 计划中
                      </a-tag>
                    </div>
                  </div>
                </div>
              </div>
            </a-card>
          </div>
        </div>
      </a-spin>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { CheckCircleOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons-vue'
import { topicApi } from '@/services/api'
import type { Article } from '@/types/article'

interface ChapterData {
  id: string
  title: string
  description?: string
  articles?: Array<{
    id?: string
    slug: string
    title?: string
    summary?: string
    status?: string
    path?: string
  }>
}

interface Chapter {
  id: string
  title: string
  description?: string
  articles: Article[]
}

const route = useRoute()
const router = useRouter()
const chapters = ref<Chapter[]>([])
const loading = ref(false)
const topicTitle = ref('')

// Calculate total articles
const totalArticles = computed(() => {
  return chapters.value.reduce((total, chapter) => total + chapter.articles.length, 0)
})

// Load articles for current topic
const loadArticles = async () => {
  const topicId = route.query.topic as string
  if (!topicId) {
    chapters.value = []
    return
  }

  loading.value = true
  try {
    const topicData = await topicApi.getTopicDetail(topicId)
    topicTitle.value = topicData.name || ''

    // Transform chapters data
    if (topicData.chapters && Array.isArray(topicData.chapters)) {
      chapters.value = (topicData.chapters as ChapterData[]).map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        articles: (chapter.articles || []).map(article => {
          const status = article.status
          const validStatus =
            status === 'draft' || status === 'completed' || status === 'planned'
              ? status
              : 'planned'
          return {
            id: article.id || article.slug,
            title: article.title || '未命名文章',
            slug: article.slug,
            summary: article.summary,
            status: validStatus,
            chapterTitle: chapter.title,
            topicId: topicId,
            path: article.path
          }
        })
      }))
    } else {
      chapters.value = []
    }
  } catch (error) {
    console.error('加载文章列表失败:', error)
    message.error('加载文章列表失败')
  } finally {
    loading.value = false
  }
}

// Handle article click - open edit page in new tab
const handleArticleClick = (article: Article) => {
  const route = router.resolve({
    path: '/articles/edit',
    query: {
      slug: article.slug,
      topic: article.topicId
    }
  })
  window.open(route.href, '_blank')
}

// Watch for topic changes
watch(
  () => route.query.topic,
  () => {
    loadArticles()
  },
  { immediate: true }
)

onMounted(() => {
  loadArticles()
})
</script>

<style scoped>
.article-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.list-header {
  flex-shrink: 0;
  padding: 24px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  color: #1f1f1f;
}

.article-count {
  font-size: 14px;
  color: #999;
}

.chapters-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  min-height: 0;
  position: relative;
}

.loading-spin {
  min-height: 200px;
}

.loading-spin :deep(.ant-spin-container) {
  height: 100%;
}

.chapters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
  align-content: flex-start;
}

.chapter-section {
  min-width: 0;
}

.chapter-card {
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.chapter-card :deep(.ant-card-head) {
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.chapter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.chapter-title {
  font-size: 16px;
  font-weight: 500;
  color: #1f1f1f;
}

.chapter-count {
  font-size: 14px;
  color: #999;
}

.articles-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.article-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.article-item:hover {
  background: #f0f7ff;
  border-color: #91caff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.article-item-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.article-number {
  flex-shrink: 0;
  width: 40px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #1890ff;
}

.article-item-content {
  flex: 1;
  min-width: 0;
}

.article-item-title {
  font-size: 15px;
  font-weight: 500;
  color: #1f1f1f;
  margin-bottom: 6px;
  line-height: 1.5;
}

.article-item-summary {
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.article-item-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.empty-placeholder {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Custom scrollbar */
.chapters-container::-webkit-scrollbar {
  width: 6px;
}

.chapters-container::-webkit-scrollbar-thumb {
  background: #e8e8e8;
  border-radius: 3px;
}

.chapters-container::-webkit-scrollbar-track {
  background: transparent;
}
</style>
