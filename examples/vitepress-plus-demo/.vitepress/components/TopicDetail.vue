<template>
  <div class="topic-detail-container">
    <div v-if="!isLoading && topicData" class="topic-content">
      <!-- 专题头部信息 -->
      <div class="topic-header">
        <div class="topic-info">
          <div class="topic-logo">
            <img :src="withBase(topicData.image)" :alt="topicData.name" />
          </div>
          <div class="topic-meta">
            <h1 class="topic-title">{{ topicData.name }}</h1>
            <p class="topic-description">{{ topicData.description }}</p>
            <div class="topic-stats">
              <span class="stat-tag">共 {{ totalArticles }} 篇文章</span>
              <span class="stat-tag">{{ chapters.length }} 个章节</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 章节内容 -->
      <div class="chapters-section">
        <div v-for="chapter in chapters" :key="chapter.id" class="chapter-section">
          <!-- 章节标题 -->
          <div class="chapter-header">
            <h2 class="chapter-title">{{ chapter.title }}</h2>
            <span class="stat-tag">{{ chapter.articles.length }} 篇文章</span>
          </div>

          <!-- 章节介绍 -->
          <div class="chapter-description">
            <p>{{ chapter.description }}</p>
          </div>

          <!-- 文章列表 -->
          <div class="articles-grid">
            <div class="articles-row">
              <div v-for="article in chapter.articles" :key="article.id" class="article-col">
                <div class="article-card" @click="navigateToArticle(article)">
                  <div class="article-header">
                    <h3 class="article-title">{{ article.title }}</h3>
                    <a-tag :color="getStatusColor(article.status)" size="small">
                      {{ getStatusText(article.status) }}
                    </a-tag>
                  </div>
                  <p class="article-summary">{{ article.summary }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 返回按钮 -->
      <div class="back-section">
        <button class="back-button" @click="goBack">← 返回专题列表</button>
      </div>
    </div>
    <div v-else class="loading-container">
      <p>{{ isLoading ? '加载中...' : '未找到专题数据' }}</p>
      <div class="debug-info">
        <h3>调试信息：</h3>
        <p>加载状态: {{ isLoading }}</p>
        <p>专题ID: {{ props.topicId }}</p>
        <p>专题数据: {{ topicData ? '已加载' : '未加载' }}</p>
        <p>章节数量: {{ chapters.length }}</p>
        <pre>{{ JSON.stringify(debugInfo, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { topicsData } from '../topics/data'
import type { Topic, Chapter, Article } from '../topics/data/types'
import { withBase } from 'vitepress'

// 接收props
const props = defineProps<{
  topicId: string
}>()

// 状态
const isLoading = ref(true)
const topicData = ref<Topic | null>(null)
const chapters = ref<Chapter[]>([])

// 获取状态文本
const getStatusText = (status: 'completed' | 'draft' | 'planned'): string => {
  const statusMap = {
    completed: '已完成',
    draft: '草稿',
    planned: '计划中'
  } as const
  return statusMap[status]
}

// 获取状态颜色
const getStatusColor = (status: 'completed' | 'draft' | 'planned'): string => {
  const colorMap = {
    completed: 'success',
    draft: 'warning',
    planned: 'default'
  } as const
  return colorMap[status]
}

// 调试信息
const debugInfo = computed(() => ({
  props,
  isLoading: isLoading.value,
  topicsAvailable: Object.keys(topicsData),
  currentTopic: props.topicId,
  hasTopicData: !!topicData.value,
  chaptersCount: chapters.value.length,
  rawTopicData: topicsData[props.topicId]
}))

// 计算总文章数
const totalArticles = computed(() => {
  return chapters.value.reduce((total, chapter) => total + chapter.articles.length, 0)
})

// 初始化数据
onMounted(async () => {
  try {
    if (props.topicId && topicsData[props.topicId]) {
      // 获取原始数据
      const rawData = topicsData[props.topicId]

      // 处理章节编号
      const processedChapters = rawData.chapters.map((chapter, chapterIndex) => {
        const chapterNum = chapterIndex + 1
        return {
          ...chapter,
          title: `第${chapterNum}章：${chapter.title}`,
          articles: chapter.articles.map((article, articleIndex) => ({
            ...article,
            title: `${chapterNum}.${articleIndex + 1} ${article.title}`
          }))
        }
      })

      // 更新数据
      topicData.value = {
        ...rawData,
        chapters: processedChapters
      }
      chapters.value = processedChapters
    } else {
      console.warn('Topic not found:', props.topicId)
    }
  } catch (error) {
    console.error('Error loading topic data:', error)
  } finally {
    isLoading.value = false
  }
})

// 导航到文章
const navigateToArticle = (article: Article): void => {
  const articleUrl = withBase(`/articles/${props.topicId}/${article.slug}`)
  window.location.href = articleUrl
}

// 返回上一页
const goBack = (): void => {
  window.location.href = withBase('/topics')
}
</script>

<style scoped>
.topic-detail-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  font-family: var(--vp-font-family-base);
}

.topic-header {
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.topic-info {
  display: flex;
  align-items: center;
  gap: 24px;
}

.topic-logo img {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  object-fit: cover;
}

.topic-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 12px 0;
  line-height: 1.2;
  color: var(--vp-c-text-1);
}

.topic-description {
  font-size: 1.1rem;
  color: var(--vp-c-text-2);
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.topic-stats {
  display: flex;
  gap: 8px;
}

.stat-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
}

.chapter-section {
  margin-bottom: 48px;
}

.chapter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--vp-c-brand);
}

.chapter-title {
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
  color: var(--vp-c-text-1);
}

.chapter-description {
  margin-bottom: 24px;
  padding: 16px 0;
  color: var(--vp-c-text-2);
}

.articles-grid {
  margin-bottom: 32px;
}

.articles-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.article-col {
  /* No specific styles needed for .article-col, it's just a wrapper */
}

.article-card {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--vp-c-divider);
  transition: all 0.3s ease;
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: var(--vp-c-brand);
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.article-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0;
  color: var(--vp-c-text-1);
  flex: 1;
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-completed {
  background: var(--vp-c-green-soft);
  color: var(--vp-c-green-1);
}

.status-draft {
  background: var(--vp-c-yellow-dimm);
  color: var(--vp-c-yellow-1);
  font-size: 14px;
  padding: 2px 8px;
}

.status-planned {
  background: var(--vp-c-gray-light-4);
  color: var(--vp-c-text-2);
  font-size: 14px;
  padding: 2px 8px;
}

.article-summary {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  margin: 0;
  flex: 1;
}

.back-section {
  text-align: center;
  padding: 32px 0;
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 48px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  color: var(--vp-c-bg-soft);
  background: var(--vp-c-brand);
  border: none;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-button:hover {
  background: var(--vp-c-brand-dark);
}

.loading-container {
  padding: 40px;
  text-align: center;
}

.debug-info {
  margin-top: 20px;
  text-align: left;
  background: var(--vp-c-bg-soft);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.debug-info h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: var(--vp-c-text-1);
}

.debug-info p {
  margin: 8px 0;
  color: var(--vp-c-text-2);
}

.debug-info pre {
  background: var(--vp-c-bg-mute);
  padding: 12px;
  border-radius: 6px;
  overflow: auto;
  font-size: 14px;
  margin-top: 12px;
}

.topic-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .topic-info {
    flex-direction: column;
    text-align: center;
  }

  .topic-stats {
    justify-content: center;
  }

  .topic-title {
    font-size: 2rem;
  }

  .chapter-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .chapter-title {
    font-size: 1.5rem;
  }
}
</style>
