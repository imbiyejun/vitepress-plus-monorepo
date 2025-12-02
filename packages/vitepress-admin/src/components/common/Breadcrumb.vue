<template>
  <div class="breadcrumb-search-container">
    <div class="breadcrumb-section">
      <a-breadcrumb>
        <a-breadcrumb-item
          v-for="(item, index) in breadcrumbs"
          :key="index"
          :class="{ 'breadcrumb-clickable': index < breadcrumbs.length - 1 }"
        >
          <span
            v-if="index < breadcrumbs.length - 1"
            @click="handleBreadcrumbClick(item.path)"
            class="breadcrumb-link"
          >
            {{ item.name }}
          </span>
          <span v-else class="breadcrumb-current">
            {{ item.name }}
          </span>
        </a-breadcrumb-item>
      </a-breadcrumb>
    </div>

    <div v-if="showSearch" class="search-section">
      <a-input
        v-model:value="searchKeyword"
        placeholder="按回车搜索"
        class="search-input"
        @pressEnter="handleSearch"
        @change="handleSearchChange"
        allowClear
      >
        <template #prefix>
          <search-outlined />
        </template>
      </a-input>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import type { Breadcrumb } from '@/services/images'

interface Props {
  breadcrumbs: Breadcrumb[]
  searchValue?: string
  showSearch?: boolean
}

interface Emits {
  (e: 'navigate', path: string): void
  (e: 'search', keyword: string): void
}

const props = withDefaults(defineProps<Props>(), {
  showSearch: true
})
const emit = defineEmits<Emits>()

const searchKeyword = ref(props.searchValue || '')

// Watch for external search value changes
watch(
  () => props.searchValue,
  newValue => {
    searchKeyword.value = newValue || ''
  }
)

const handleBreadcrumbClick = (path: string) => {
  emit('navigate', path)
}

const handleSearch = () => {
  emit('search', searchKeyword.value.trim())
}

const handleSearchChange = () => {
  // Clear search when input is empty
  if (!searchKeyword.value.trim()) {
    emit('search', '')
  }
}
</script>

<style scoped>
.breadcrumb-search-container {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.breadcrumb-section {
  flex-shrink: 0;
  min-width: 0;
}

.search-section {
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
}

.breadcrumb-clickable {
  cursor: pointer;
}

.breadcrumb-link {
  color: #1890ff;
  cursor: pointer;
  transition: color 0.3s;
}

.breadcrumb-link:hover {
  color: #40a9ff;
}

.breadcrumb-current {
  color: #666;
  font-weight: 500;
}

:deep(.ant-breadcrumb-link) {
  color: inherit;
}

/* Responsive design */
@media (max-width: 768px) {
  .breadcrumb-search-container {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .search-section {
    max-width: none;
  }
}
</style>
