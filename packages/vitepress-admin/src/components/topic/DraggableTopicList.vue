<!-- 可拖拽专题列表组件 -->
<template>
  <div class="draggable-topic-list">
    <draggable
      v-model="topicList"
      :animation="150"
      handle=".drag-handle"
      item-key="id"
      @end="onDragEnd"
    >
      <template #item="{ element }">
        <div class="topic-item">
          <DragHandle class="drag-handle" />
          <div class="topic-content">
            <div class="topic-title">{{ element.title }}</div>
            <div class="topic-path text-gray">{{ element.path }}</div>
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

interface Topic {
  id: string
  title: string
  path: string
  order?: number
}

interface Props {
  topics?: Topic[]
  onOrderChange?: (topics: Topic[]) => void
}

const props = withDefaults(defineProps<Props>(), {
  topics: () => []
})

const { items, onDragEnd } = useDraggable<Topic>({
  initialItems: props.topics,
  onOrderChange: props.onOrderChange
})

const topicList = computed({
  get: () => items.value,
  set: value => {
    items.value = value
  }
})
</script>

<style scoped>
.draggable-topic-list {
  width: 100%;
}

.topic-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  transition: all 0.3s;
}

.topic-item:hover {
  border-color: #1890ff;
}

.drag-handle {
  margin-right: 12px;
  cursor: move;
}

.topic-content {
  flex: 1;
}

.topic-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.topic-path {
  font-size: 14px;
  color: #666;
}
</style>
