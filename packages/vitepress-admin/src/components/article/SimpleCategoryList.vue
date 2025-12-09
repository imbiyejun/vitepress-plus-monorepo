<template>
  <div class="category-manager">
    <div class="category-list">
      <a-tag
        v-for="category in categories"
        :key="category.id"
        :class="{
          active: selectedCategorySlug === category.slug
        }"
        class="category-tag"
        @click="handleCategorySelect(category.id)"
      >
        <div class="category-content">
          <span class="category-name">{{ category.name }}</span>
          <span class="category-count">{{ category.topics.length }}</span>
        </div>
      </a-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Category } from '@/types/topic'

defineProps<{
  categories: Category[]
  selectedCategorySlug?: string
}>()

const emit = defineEmits<{
  (e: 'select', categoryId: string): void
}>()

const handleCategorySelect = (categoryId: string) => {
  emit('select', categoryId)
}
</script>

<style scoped>
.category-manager {
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  cursor: pointer;
  background: #f5f5f5;
  border: none;
  color: rgba(0, 0, 0, 0.85);
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s;
}

.category-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.category-tag:hover {
  background: #e6f7ff;
  color: #1890ff;
}

.category-tag.active {
  background: #1890ff;
  color: #fff;
}

.category-name {
  line-height: 20px;
}

.category-count {
  font-size: 12px;
  background: rgba(0, 0, 0, 0.06);
  padding: 0 6px;
  border-radius: 10px;
  line-height: 16px;
}

.category-tag.active .category-count {
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
}
</style>
