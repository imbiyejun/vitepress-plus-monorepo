<template>
  <ClientOnly>
    <div v-if="article?.status !== 'completed'" class="article-status-tag">
      <a-tag v-if="article" :color="statusColor">{{ statusText }}</a-tag>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { topicsData } from '../topics/data'
import type { Article } from '../topics/data/types'

// 获取当前文章信息
const { page } = useData()

const article = computed(() => {
  const currentPath = page.value.relativePath
  // 检查是否是文章路径
  const matches = currentPath.match(/^articles\/([^/]+)\/([^/]+)\.md$/)
  if (!matches) return null

  const [, topicId, articleSlug] = matches
  const topic = topicsData[topicId]
  if (!topic) return null

  // 遍历所有章节查找当前文章
  for (const chapter of topic.chapters) {
    const article = chapter.articles.find(article => article.slug === articleSlug)
    if (article) return article
  }
  return null
})

// 状态文本
const statusText = computed(() => {
  if (!article.value || article.value.status === 'completed') return ''

  const statusMap: Record<Exclude<Article['status'], 'completed'>, string> = {
    draft: '草稿',
    planned: '计划中'
  }
  return statusMap[article.value.status]
})

// 状态颜色
const statusColor = computed(() => {
  if (!article.value || article.value.status === 'completed') return ''

  const colorMap: Record<Exclude<Article['status'], 'completed'>, string> = {
    draft: 'warning',
    planned: 'default'
  }
  return colorMap[article.value.status]
})
</script>

<style scoped>
.article-status-tag {
  margin: 1rem 0;
  display: flex;
  justify-content: flex-start;
}

:deep(.ant-tag) {
  margin-right: 0;
  font-size: 14px;
  padding: 2px 8px;
}
</style>
