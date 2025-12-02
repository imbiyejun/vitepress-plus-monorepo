<template>
  <div class="article-manager">
    <Transition>
      <div v-if="!collapsed" class="article-sidebar">
        <div class="sidebar-header">
          <div class="header-title">选择专题</div>
        </div>

        <SimpleCategoryList
          :categories="categories"
          :selected-category-slug="route.query.category as string"
          @select="handleCategorySelect"
        />

        <SimpleTopicTree
          :topics="currentTopics"
          :selectedTopicId="route.query.topic as string"
          @select="handleTopicSelect"
        />
      </div>
    </Transition>

    <div
      class="collapse-trigger"
      :class="{ 'trigger-collapsed': collapsed }"
      @click="toggleCollapse"
    >
      <MenuFoldOutlined v-if="!collapsed" />
      <MenuUnfoldOutlined v-else />
    </div>

    <div :class="['article-content', { 'content-expanded': collapsed }]">
      <ArticleList v-if="route.query.topic" />
      <div v-else class="empty-state">
        <a-empty description="请选择一个专题查看文章列表" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
import { useTopics } from '@/hooks/useTopics'
import SimpleCategoryList from '@/components/article/SimpleCategoryList.vue'
import SimpleTopicTree from '@/components/article/SimpleTopicTree.vue'
import ArticleList from '@/components/article/ArticleList.vue'

const route = useRoute()
const router = useRouter()
const { categories, currentTopics, loadTopics, selectCategory, selectTopic } = useTopics()

const collapsed = ref(false)

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}

// Handle category selection
const handleCategorySelect = async (categoryId: string) => {
  const category = categories.value.find(c => c.id === categoryId)
  if (!category) return

  await selectCategory(category.id)

  // Auto-select first topic if available
  if (category.topics.length > 0) {
    const firstTopic = category.topics[0]
    await selectTopic(firstTopic.id)
    await router.push({
      path: '/articles',
      query: { category: category.slug, topic: firstTopic.id }
    })
  } else {
    await router.push({
      path: '/articles',
      query: { category: category.slug }
    })
  }
}

// Handle topic selection
const handleTopicSelect = async (topicId: string) => {
  const categorySlug = route.query.category as string
  if (!categorySlug) return

  await selectTopic(topicId)

  await router.push({
    path: '/articles',
    query: { category: categorySlug, topic: topicId }
  })
}

// Initialize on mount
onMounted(async () => {
  await loadTopics()

  const categorySlug = route.query.category as string
  const topicSlug = route.query.topic as string

  if (categorySlug) {
    const category = categories.value.find(c => c.slug === categorySlug)
    if (category) {
      await selectCategory(category.id)

      if (topicSlug) {
        const topic = category.topics.find(t => t.id === topicSlug)
        if (topic) {
          await selectTopic(topic.id)
        } else if (category.topics.length > 0) {
          const firstTopic = category.topics[0]
          await selectTopic(firstTopic.id)
          await router.replace({
            path: '/articles',
            query: { category: categorySlug, topic: firstTopic.id }
          })
        }
      } else if (category.topics.length > 0) {
        const firstTopic = category.topics[0]
        await selectTopic(firstTopic.id)
        await router.replace({
          path: '/articles',
          query: { category: categorySlug, topic: firstTopic.id }
        })
      }
    }
  } else if (categories.value.length > 0) {
    const firstCategory = categories.value[0]
    await selectCategory(firstCategory.id)
    if (firstCategory.topics.length > 0) {
      const firstTopic = firstCategory.topics[0]
      await selectTopic(firstTopic.id)
      await router.replace({
        path: '/articles',
        query: { category: firstCategory.slug, topic: firstTopic.id }
      })
    }
  }
})

// Watch route changes
watch(
  () => [route.query.category, route.query.topic],
  async ([newCategorySlug, newTopicSlug], [oldCategorySlug, oldTopicSlug]) => {
    if (newCategorySlug !== oldCategorySlug) {
      const category = categories.value.find(c => c.slug === newCategorySlug)
      if (category) {
        await selectCategory(category.id)
      }
    }

    if (newTopicSlug !== oldTopicSlug) {
      for (const category of categories.value) {
        const topic = category.topics.find(t => t.id === newTopicSlug)
        if (topic) {
          await selectCategory(category.id)
          await selectTopic(topic.id)
          break
        }
      }
    }
  }
)
</script>

<style scoped>
.article-manager {
  display: flex;
  height: 100%;
  padding: 24px;
  background: #f0f2f5;
  position: relative;
  overflow: hidden;
}

.article-sidebar {
  position: absolute;
  left: 24px;
  top: 24px;
  bottom: 24px;
  width: 280px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
  transform: translateX(0);
}

.article-sidebar.v-leave-active,
.article-sidebar.v-enter-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.article-sidebar.v-leave-to,
.article-sidebar.v-enter-from {
  transform: translateX(-100%);
}

.sidebar-header {
  margin-bottom: 16px;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #1f1f1f;
}

.article-content {
  position: absolute;
  left: 328px;
  right: 24px;
  top: 24px;
  bottom: 24px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.content-expanded {
  left: 60px;
}

.collapse-trigger {
  position: absolute;
  left: 292px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 2;
  transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.trigger-collapsed {
  left: 36px;
}

.collapse-trigger :deep(.anticon) {
  color: #001529;
  font-size: 14px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 14px;
}
</style>
