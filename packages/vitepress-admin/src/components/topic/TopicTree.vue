<!-- 专题树组件 -->
<template>
  <div class="topic-tree">
    <div class="topic-list">
      <div
        v-for="topic in topics"
        :key="topic.id"
        class="topic-item"
        :class="{ active: selectedTopicId === topic.id }"
        @click="$emit('select', topic.id)"
      >
        <div class="topic-item-content">
          <div class="topic-icon">
            <img v-if="topic.icon" :src="topic.icon" :alt="topic.title" />
            <BookOutlined v-else />
          </div>
          <div class="topic-info">
            <div class="topic-title">{{ topic.title }}</div>
            <div class="topic-meta">
              <span class="topic-articles">{{ topic.articleCount || 0 }} 篇文章</span>
            </div>
          </div>
          <div class="topic-actions">
            <a-button type="text" size="small" @click.stop="$emit('edit', topic)">
              <EditOutlined />
            </a-button>
            <a-popconfirm
              :title="'确定要删除专题「' + topic.title + '」吗？'"
              ok-text="确定"
              cancel-text="取消"
              ok-type="danger"
              @confirm="$emit('delete', topic)"
              @click.stop
            >
              <a-button type="text" danger size="small">
                <DeleteOutlined />
              </a-button>
            </a-popconfirm>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import type { Topic } from '@/types/topic'

defineProps<{
  topics: Topic[]
  selectedTopicId?: string
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'edit', topic: Topic): void
  (e: 'delete', topic: Topic): void
}>()
</script>

<style scoped>
.topic-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.topic-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.topic-item {
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.topic-item:hover {
  background: #f5f5f5;
}

.topic-item.active {
  background: #e6f4ff;
  border-color: #91caff;
}

.topic-item-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topic-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 6px;
  flex-shrink: 0;
}

.topic-icon img {
  width: 24px;
  height: 24px;
  object-fit: cover;
  border-radius: 4px;
}

.topic-icon :deep(.anticon) {
  font-size: 18px;
  color: #8c8c8c;
}

.topic-info {
  flex: 1;
  min-width: 0;
}

.topic-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.topic-articles {
  color: #8c8c8c;
}

.topic-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.topic-item:hover .topic-actions {
  opacity: 1;
}

/* 自定义滚动条样式 */
.topic-tree::-webkit-scrollbar {
  width: 6px;
}

.topic-tree::-webkit-scrollbar-thumb {
  background: #e8e8e8;
  border-radius: 3px;
}

.topic-tree::-webkit-scrollbar-track {
  background: transparent;
}

/* 暗色主题适配 */
:deep(.dark) {
  .topic-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .topic-item.active {
    background: rgba(24, 144, 255, 0.1);
    border-color: #1890ff;
  }

  .topic-title {
    color: rgba(255, 255, 255, 0.85);
  }

  .topic-articles {
    color: rgba(255, 255, 255, 0.45);
  }

  .topic-icon {
    background: rgba(255, 255, 255, 0.08);
  }

  .topic-icon :deep(.anticon) {
    color: rgba(255, 255, 255, 0.45);
  }
}
</style>
