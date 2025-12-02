<template>
  <div class="topic-detail-container">
    <div v-if="!isLoading && topicData" class="topic-content">
      <!-- Topic header -->
      <div class="topic-header">
        <div class="topic-info">
          <div class="topic-logo">
            <img :src="withBase(topicData.image)" :alt="topicData.name" />
          </div>
          <div class="topic-meta">
            <h1 class="topic-title">{{ topicData.name }}</h1>
            <p class="topic-description">{{ topicData.description }}</p>
            <div class="topic-stats">
              <span class="stat-tag">{{ totalArticles }} articles</span>
              <span class="stat-tag">{{ chapters.length }} chapters</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Chapters section -->
      <div class="chapters-section">
        <div v-for="chapter in chapters" :key="chapter.id" class="chapter-section">
          <!-- Chapter title -->
          <div class="chapter-header">
            <h2 class="chapter-title">{{ chapter.title }}</h2>
            <span class="stat-tag">{{ chapter.articles.length }} articles</span>
          </div>

          <!-- Chapter description -->
          <div class="chapter-description">
            <p>{{ chapter.description }}</p>
          </div>

          <!-- Articles list -->
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

      <!-- Back button -->
      <div class="back-section">
        <button class="back-button" @click="goBack">← Back to Topics</button>
      </div>
    </div>
    <div v-else class="loading-container">
      <p>{{ isLoading ? 'Loading...' : 'Topic not found' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { topicsData } from '../topics/data'
import type { Topic, Chapter, Article } from '../topics/data/types'
import { withBase } from 'vitepress'

// Receive props
const props = defineProps<{
  topicId: string
}>()

// State
const isLoading = ref(true)
const topicData = ref<Topic | null>(null)
const chapters = ref<Chapter[]>([])

// Get status text
const getStatusText = (status: 'completed' | 'draft' | 'planned'): string => {
  const statusMap = {
    completed: 'Completed',
    draft: 'Draft',
    planned: 'Planned'
  } as const
  return statusMap[status]
}

// Get status color
const getStatusColor = (status: 'completed' | 'draft' | 'planned'): string => {
  const colorMap = {
    completed: 'success',
    draft: 'warning',
    planned: 'default'
  } as const
  return colorMap[status]
}

// Calculate total articles
const totalArticles = computed(() => {
  return chapters.value.reduce((total, chapter) => total + chapter.articles.length, 0)
})

// Initialize data
onMounted(async () => {
  try {
    if (props.topicId && topicsData[props.topicId]) {
      // Get raw data
      const rawData = topicsData[props.topicId]

      // Process chapter numbers
      const processedChapters = rawData.chapters.map((chapter, chapterIndex) => {
        const chapterNum = chapterIndex + 1
        return {
          ...chapter,
          title: `Chapter ${chapterNum}: ${chapter.title}`,
          articles: chapter.articles.map((article, articleIndex) => ({
            ...article,
            title: `${chapterNum}.${articleIndex + 1} ${article.title}`
          }))
        }
      })

      // Update data
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

// Navigate to article
const navigateToArticle = (article: Article): void => {
  const articleUrl = withBase(`/articles/${props.topicId}/${article.slug}`)
  window.location.href = articleUrl
}

// Go back
const goBack = (): void => {
  window.location.href = withBase('/topics')
}
</script>

<style scoped>
/* Styles omitted for brevity - copy from original */
.topic-detail-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.topic-header {
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
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
}

.topic-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 12px 0;
}

.articles-grid .articles-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.article-card {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--vp-c-divider);
}

.article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>

