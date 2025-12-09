<template>
  <div class="category-manager">
    <div class="category-list">
      <a-dropdown v-for="category in categories" :key="category.id" :trigger="['contextmenu']">
        <template #overlay>
          <a-menu>
            <a-menu-item @click="handleEdit(category)">
              <template #icon><EditOutlined /></template>
              编辑分类
            </a-menu-item>
            <a-menu-item
              @click="handleDelete(category)"
              :disabled="category.topics.length > 0"
              :class="{ 'menu-item-danger': category.topics.length === 0 }"
            >
              <template #icon><DeleteOutlined /></template>
              删除分类
            </a-menu-item>
          </a-menu>
        </template>

        <a-tag
          :class="{
            active: selectedCategorySlug === category.slug
          }"
          class="category-tag"
          @click="handleCategorySelect(category.id)"
          @contextmenu.prevent
        >
          <div class="category-content">
            <span class="category-name">{{ category.name }}</span>
            <span class="category-count">{{ category.topics.length }}</span>
          </div>
        </a-tag>
      </a-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import type { Category } from '@/types/topic'

defineProps<{
  categories: Category[]
  selectedCategorySlug?: string
}>()

const emit = defineEmits<{
  (e: 'select', categoryId: string): void
  (e: 'edit', category: Category): void
  (e: 'delete', category: Category): void
}>()

const handleCategorySelect = (categoryId: string) => {
  emit('select', categoryId)
}

const handleEdit = (category: Category) => {
  emit('edit', category)
}

const handleDelete = (category: Category) => {
  if (category.topics.length === 0) {
    emit('delete', category)
  }
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

:deep(.ant-tag) {
  margin: 0;
  cursor: pointer;
  background: #f5f5f5;
  border: none;
  color: rgba(0, 0, 0, 0.85);
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s;
}

:deep(.ant-tag):hover {
  background: #e6f7ff;
  color: #1890ff;
}

:deep(.ant-tag).active {
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

:deep(.ant-tag).active .category-count {
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
}

:deep(.ant-dropdown-menu-item) {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.menu-item-danger) {
  color: #ff4d4f;
}

:deep(.menu-item-danger:hover) {
  background-color: #fff1f0;
}

:deep(.ant-dropdown-menu-item-disabled) {
  cursor: not-allowed;
  color: rgba(0, 0, 0, 0.25);
}
</style>
