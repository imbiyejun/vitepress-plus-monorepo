<!-- 可拖拽文章列表组件 -->
<template>
  <div class="draggable-article-list">
    <draggable
      v-model="articleList"
      :animation="150"
      handle=".drag-handle"
      item-key="id"
      @end="onDragEnd"
    >
      <template #item="{ element }">
        <div class="article-item">
          <DragHandle class="drag-handle" />
          <div class="article-content">
            <div class="article-title">{{ element.title }}</div>
            <div class="article-meta">
              <span class="article-date">{{ element.date }}</span>
              <span class="article-path text-gray">{{ element.path }}</span>
            </div>
          </div>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import DragHandle from '../common/DragHandle.vue'
import { useDraggable } from '../../hooks/useDraggable'

interface Article {
  id: string
  title: string
  path: string
  date: string
  order?: number
}

interface Props {
  articles?: Article[]
  onOrderChange?: (articles: Article[]) => void
}

const props = withDefaults(defineProps<Props>(), {
  articles: () => []
})

const { items, onDragEnd } = useDraggable<Article>({
  initialItems: props.articles,
  onOrderChange: props.onOrderChange
})

const articleList = computed({
  get: () => items.value,
  set: value => {
    items.value = value
  }
})
</script>

<style scoped>
.draggable-article-list {
  width: 100%;
}

.article-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  transition: all 0.3s;
}

.article-item:hover {
  border-color: #1890ff;
}

.drag-handle {
  margin-right: 12px;
  cursor: move;
}

.article-content {
  flex: 1;
}

.article-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #666;
}

.article-date {
  color: #999;
}

.article-path {
  color: #666;
}
</style>
