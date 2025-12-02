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

<style scoped lang="less">
// Less变量定义
@border-radius: 12px;
@border-radius-small: 8px;
@transition-duration: 0.3s;
@hover-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
@container-padding: 20px;
@item-padding: 24px;
@item-padding-mobile: 20px;

// Less Mixins
.hover-effect() {
  transform: translateY(-5px);
  box-shadow: @hover-shadow;
  border-color: var(--vp-c-brand-1);
}

.flex-center() {
  display: flex;
  align-items: center;
  justify-content: center;
}

.topics-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: @container-padding;
}

.topic-category {
  margin-bottom: 60px;

  .category-title {
    font-size: 2rem;
    font-weight: bold;
    color: var(--vp-c-brand-1);
    margin-bottom: 30px;
    padding-bottom: 10px;
    border-bottom: 3px solid var(--vp-c-brand-1);
    display: inline-block;

    @media (max-width: 768px) {
      font-size: 1.5rem;
    }
  }

  .topics-grid {
    margin-top: 20px;
  }
}

.topic-item {
  text-decoration: none;
  background: var(--vp-c-bg-soft);
  border-radius: @border-radius;
  padding: @item-padding;
  transition: all @transition-duration ease;
  border: 1px solid var(--vp-c-divider);
  height: 100%;
  display: flex;
  flex-direction: column;
  cursor: pointer;

  &:hover {
    .hover-effect();
  }

  @media (max-width: 768px) {
    padding: @item-padding-mobile;
  }

  .topic-image {
    text-align: center;
    margin-bottom: 20px;

    img {
      max-width: 100%;
      height: auto;
      border-radius: @border-radius-small;
      transition: transform @transition-duration ease;

      &:hover {
        transform: scale(1.05);
      }
    }
  }

  .topic-content {
    text-align: center;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .topic-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--vp-c-text-1);
      margin-bottom: 12px;
      transition: color @transition-duration ease;

      &:hover {
        color: var(--vp-c-brand-1);
      }
    }

    .topic-description {
      color: var(--vp-c-text-2);
      line-height: 1.6;
      font-size: 0.95rem;
      flex: 1;
    }
  }
}
</style>
