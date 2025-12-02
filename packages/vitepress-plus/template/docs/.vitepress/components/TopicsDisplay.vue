<template>
  <div class="topics-container">
    <div v-for="category in topics" :key="category.title" class="topic-category">
      <h2 class="category-title">{{ category.title }}</h2>
      <a-row :gutter="[24, 24]" class="topics-grid">
        <a-col
          v-for="topic in category.items"
          :key="topic.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          :xl="6"
        >
          <a class="topic-item" :href="withBase(`/topics/${topic.slug}`)">
            <div class="topic-image">
              <img :src="topic.image" :alt="topic.name" />
            </div>
            <div class="topic-content">
              <h3 class="topic-name">{{ topic.name }}</h3>
              <p class="topic-description">{{ topic.description }}</p>
            </div>
          </a>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { topics as topicsData, type TopicItem, type TopicCategory } from '../topics/config'
import { withBase } from 'vitepress'

const topics = ref<TopicCategory[]>(topicsData)
</script>

<style scoped>
.topics-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.topic-category {
  margin-bottom: 60px;
}

.category-title {
  font-size: 2rem;
  font-weight: bold;
  color: var(--vp-c-brand);
  margin-bottom: 30px;
  padding-bottom: 10px;
  border-bottom: 3px solid var(--vp-c-brand);
}

.topic-item {
  text-decoration: none;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;
  border: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.topic-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.topic-image {
  text-align: center;
  margin-bottom: 20px;
}

.topic-image img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.topic-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 12px;
}

.topic-description {
  color: var(--vp-c-text-2);
  line-height: 1.6;
}
</style>

