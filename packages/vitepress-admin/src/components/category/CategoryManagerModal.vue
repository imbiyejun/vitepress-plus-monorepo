<template>
  <a-modal
    :open="modelValue"
    @ok="handleSaveCategories"
    @cancel="handleCancel"
    :maskClosable="false"
    :okButtonProps="{ disabled: !hasOrderChanged && !hasTopicOrderChanged }"
    width="1200px"
    class="category-manager-modal"
    :style="{ top: '40px' }"
  >
    <template #title>
      <div>
        <div class="modal-title">
          <span>管理专题大类</span>
          <div class="modal-actions">
            <a-space>
              <span>每行显示：</span>
              <a-select v-model:value="cardsPerRow" style="width: 80px">
                <a-select-option :value="1">1个</a-select-option>
                <a-select-option :value="2">2个</a-select-option>
                <a-select-option :value="3">3个</a-select-option>
                <a-select-option :value="4">4个</a-select-option>
                <a-select-option :value="5">5个</a-select-option>
                <a-select-option :value="6">6个</a-select-option>
              </a-select>
            </a-space>
          </div>
        </div>
      </div>
    </template>

    <div class="categories-container">
      <VueDraggable
        v-model="categoriesData"
        item-key="id"
        handle=".category-drag-handle"
        :class="['categories-list', `cards-per-row-${cardsPerRow}`]"
        @change="handleCategoriesChange"
      >
        <template #item="{ element: category }">
          <div class="category-wrapper">
            <a-card class="category-card" :bordered="false">
              <template #title>
                <div class="category-card-header">
                  <MenuOutlined class="category-drag-handle" />
                  <span class="category-name">
                    {{ category.name }}
                    <span class="category-count">{{ category.topics.length }}</span>
                  </span>
                  <div class="category-actions">
                    <a-button
                      type="text"
                      class="category-expand"
                      @click.stop="toggleCategoryExpand(category.id)"
                    >
                      <CaretDownOutlined
                        :class="['expand-icon', { expanded: expandedCategories[category.id] }]"
                      />
                    </a-button>
                    <a-button
                      type="text"
                      class="category-edit"
                      @click.stop="handleEditCategory(category)"
                    >
                      <EditOutlined />
                    </a-button>
                    <a-button
                      type="text"
                      class="category-delete"
                      @click="handleRemoveCategory(category.id)"
                      :disabled="category.topics.length > 0"
                    >
                      <DeleteOutlined />
                    </a-button>
                  </div>
                </div>
              </template>

              <!-- 专题列表 -->
              <div v-if="expandedCategories[category.id]" class="topics-list-wrapper expanded">
                <VueDraggable
                  v-model="category.topics"
                  :group="{ name: 'topics' }"
                  item-key="id"
                  handle=".topic-drag-handle"
                  class="topics-list"
                  @change="(e: DragChangeEvent) => handleTopicsChange(e, category.id)"
                >
                  <template #item="{ element: topic }">
                    <div class="topic-card">
                      <MenuOutlined class="topic-drag-handle" />
                      <div class="topic-info">
                        <div class="topic-title">{{ topic.title }}</div>
                      </div>
                      <div class="topic-actions">
                        <a-button
                          type="text"
                          size="small"
                          @click.stop="handleEditTopic(topic, category.id)"
                        >
                          <EditOutlined />
                        </a-button>
                      </div>
                    </div>
                  </template>

                  <!-- 空状态 -->
                  <template #footer>
                    <div v-if="category.topics.length === 0" class="empty-topics">
                      <a-empty description="拖拽专题到这里" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
                    </div>
                  </template>
                </VueDraggable>
              </div>
            </a-card>
          </div>
        </template>
      </VueDraggable>
    </div>

    <!-- 编辑分类弹窗 -->
    <CategoryEditModal
      v-model="editModalVisible"
      :category="editingCategory"
      :categories="categories"
      :mode="editingCategory ? 'edit' : 'add'"
      @submit="handleCategorySubmit"
    />

    <!-- 编辑专题弹窗 -->
    <TopicFormModal
      v-model="editTopicVisible"
      :categories="categories"
      :defaultCategoryId="editingTopicCategoryId"
      :topic="editingTopic"
      mode="edit"
      @submit="handleTopicSubmit"
    />
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  CaretDownOutlined,
  MenuOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons-vue'
import VueDraggable from 'vuedraggable'
import { Empty, message } from 'ant-design-vue'
import CategoryEditModal from './CategoryEditModal.vue'
import TopicFormModal from '../topic/TopicFormModal.vue'
import type { Category, Topic } from '@/types/topic'
import { topicApi } from '@/services/api'

interface DragChangeEvent {
  added?: {
    element: Topic
    newIndex: number
  }
  removed?: {
    element: Topic
    oldIndex: number
  }
  moved?: {
    element: Topic
    oldIndex: number
    newIndex: number
  }
}

const props = defineProps<{
  modelValue: boolean
  categories: Category[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'add-category': [name: string, slug: string]
  'remove-category': [id: string]
  'update-category': [id: string, name: string, slug: string]
  save: [categories: Category[]]
  'topic-updated': []
}>()

// 编辑弹窗控制
const editModalVisible = ref(false)
const editingCategory = ref<Category | null>(null)

// 编辑专题弹窗控制
const editTopicVisible = ref(false)
const editingTopic = ref<Topic | null>(null)
const editingTopicCategoryId = ref<string>('')

// 处理分类提交（添加或更新）
const handleCategorySubmit = async (id: string | null, name: string, slug: string) => {
  if (id) {
    // 更新分类
    await emit('update-category', id, name, slug)
  } else {
    // 添加分类
    await emit('add-category', name, slug)
  }
  editModalVisible.value = false
}

// 编辑分类
const handleEditCategory = (category: Category) => {
  editingCategory.value = category
  editModalVisible.value = true
}

// 每行显示的卡片数量
const cardsPerRow = ref(3)

// 展开状态控制
const expandedCategories = ref<Record<string, boolean>>({})

// 记录原始顺序
const originalOrder = ref<string[]>([])

// 本地数据副本
const categoriesData = ref<Category[]>([])
const hasOrderChanged = ref(false)
const hasTopicOrderChanged = ref(false)

// 路由
const router = useRouter()
const route = useRoute()

// 监听弹窗打开
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      // 默认展开所有分类
      props.categories.forEach(category => {
        expandedCategories.value[category.id] = true
      })
    }
  }
)

// 监听props.categories的变化
watch(
  () => props.categories,
  newCategories => {
    // 创建深拷贝，避免直接修改props
    categoriesData.value = JSON.parse(JSON.stringify(newCategories))
    // 保存当前的展开状态
    const currentExpandedState = { ...expandedCategories.value }
    // 确保所有分类都是展开状态
    newCategories.forEach(category => {
      currentExpandedState[category.id] = true
    })
    // 更新展开状态
    expandedCategories.value = currentExpandedState
    // 更新原始顺序（用于检测变化）
    originalOrder.value = categoriesData.value.map(category => category.id)
    // 保存专题的原始顺序
    saveOriginalTopicsOrder()
    // 重置变更状态
    hasOrderChanged.value = false
    hasTopicOrderChanged.value = false
  },
  { deep: true }
)

// 记录原始专题顺序
const originalTopicsOrder = ref<Map<string, string[]>>(new Map())

// 保存原始专题顺序
const saveOriginalTopicsOrder = () => {
  originalTopicsOrder.value = new Map()
  categoriesData.value.forEach(category => {
    originalTopicsOrder.value.set(
      category.id,
      category.topics.map(topic => topic.id)
    )
  })
}

// 切换分类展开状态
const toggleCategoryExpand = (categoryId: string) => {
  expandedCategories.value[categoryId] = !expandedCategories.value[categoryId]
}

// 删除分类
const handleRemoveCategory = async (categoryId: string) => {
  try {
    await emit('remove-category', categoryId)
  } catch {
    // 错误已在父组件处理
  }
}

// 处理专题拖拽变化
const handleTopicsChange = (e: DragChangeEvent, categoryId: string) => {
  console.log('Topics change event:', e)

  // 如果是从其他分类拖入
  if (e.added) {
    const { element: topic, newIndex } = e.added
    console.log(`专题 ${topic.title} 被拖入分类 ${categoryId} 的第 ${newIndex} 位`)
  }

  // 如果是拖到其他分类
  if (e.removed) {
    const { element: topic, oldIndex } = e.removed
    console.log(`专题 ${topic.title} 从原位置 ${oldIndex} 被拖出`)
  }

  // 如果是在同一分类内移动
  if (e.moved) {
    const { element: topic, oldIndex, newIndex } = e.moved
    console.log(`专题 ${topic.title} 在分类内从 ${oldIndex} 移动到 ${newIndex}`)
  }

  hasTopicOrderChanged.value = true
}

// 处理分类拖拽变化
const handleCategoriesChange = () => {
  checkCategoryOrderChanged()
}

// 检查分类顺序是否改变
const checkCategoryOrderChanged = () => {
  if (originalOrder.value.length !== categoriesData.value.length) {
    hasOrderChanged.value = true
    return
  }
  hasOrderChanged.value = originalOrder.value.some(
    (id, index) => id !== categoriesData.value[index].id
  )
}

// 处理取消
const handleCancel = () => {
  emit('update:modelValue', false)
}

// 保存所有更改
const handleSaveCategories = async () => {
  if (hasOrderChanged.value || hasTopicOrderChanged.value) {
    // 在保存前检查当前选中的专题是否改变了分类
    const currentTopicId = route.query.topic as string
    const currentCategorySlug = route.query.category as string

    if (currentTopicId) {
      // 在新的分类数据中查找当前专题所在的分类
      let newCategorySlug: string | null = null
      for (const category of categoriesData.value) {
        const topic = category.topics.find(t => t.id === currentTopicId)
        if (topic) {
          newCategorySlug = category.slug
          break
        }
      }

      // 如果专题所在的分类改变了，更新路由
      if (newCategorySlug && newCategorySlug !== currentCategorySlug) {
        await router.replace({
          query: { ...route.query, category: newCategorySlug }
        })
      }
    }

    // 保存更改
    await emit('save', categoriesData.value)
  }
  emit('update:modelValue', false)
}

// 监听弹窗打开，重置状态
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      hasOrderChanged.value = false
      hasTopicOrderChanged.value = false
      // 保存打开弹窗时的顺序
      originalOrder.value = props.categories.map(category => category.id)
      saveOriginalTopicsOrder()
      // 默认收起所有分类
      props.categories.forEach(category => {
        expandedCategories.value[category.id] = false
      })
    }
  }
)

// 编辑专题
const handleEditTopic = (topic: Topic, categoryId: string) => {
  editingTopic.value = topic
  editingTopicCategoryId.value = categoryId
  editTopicVisible.value = true
}

// 处理专题提交
const handleTopicSubmit = async (formData: {
  name: string
  slug: string
  categoryId: string
  description: string
  image: string
}) => {
  try {
    // 先获取原有的专题数据
    const currentTopic = await topicApi.getTopicDetail(editingTopic.value?.id as string)

    // 记录原始分类ID
    const originalCategoryId = currentTopic.categoryId

    // 构建更新数据，保持原有的 chapters 数据不变
    const updateData = {
      ...currentTopic,
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      image: formData.image,
      categoryId: formData.categoryId
    }

    await topicApi.updateTopicDetail(editingTopic.value?.id as string, updateData)

    // 如果分类改变了，且当前路由是这个专题，则更新路由
    if (
      originalCategoryId !== formData.categoryId &&
      route.params.topicSlug === editingTopic.value?.id
    ) {
      // 找到新分类的 slug
      const newCategory = props.categories.find(c => c.id === formData.categoryId)
      if (newCategory) {
        // 更新路由到新分类
        await router.push(`/${newCategory.slug}/${editingTopic.value?.id}`)
      }
    }

    // 通知专题更新
    emit('topic-updated')
    editTopicVisible.value = false
  } catch (error) {
    console.error('更新专题失败:', error)
    message.error(error instanceof Error ? error.message : '更新专题失败')
  }
}
</script>

<style scoped>
/* 管理专题大类弹窗样式 */
:deep(.category-manager-modal .ant-modal) {
  top: 0;
  padding-bottom: 0;
}

:deep(.category-manager-modal .ant-modal-body) {
  height: calc(100vh - 80px);
  overflow-y: hidden;
  padding: 24px;
}

:deep(.category-manager-modal .ant-modal-footer) {
  border-top: 1px solid #f0f0f0;
  padding: 16px 24px;
}

.categories-container {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 8px;
  margin: 0;
  height: calc(100vh - 240px);
  overflow-y: auto;
}

.category-form-container {
  margin-bottom: 8px;
  background: #fff;
  padding: 12px;
  border-radius: 8px;
}

/* 滚动条样式优化 */
.categories-container::-webkit-scrollbar {
  width: 6px;
}

.categories-container::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.categories-container::-webkit-scrollbar-track {
  background: transparent;
}

/* 分类列表网格布局 */
.categories-list {
  display: grid;
  gap: 12px;
  width: 100%;
  grid-auto-rows: 1fr;
}

.categories-list.cards-per-row-1 {
  grid-template-columns: minmax(0, 1fr);
}

.categories-list.cards-per-row-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.categories-list.cards-per-row-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.categories-list.cards-per-row-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.categories-list.cards-per-row-5 {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.categories-list.cards-per-row-6 {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.category-wrapper {
  min-width: 0;
  width: 100%;
}

/* 分类卡片样式 */
:deep(.ant-card) {
  width: 100%;
  height: 100%;
}

:deep(.category-card) {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  height: 100%;
  display: flex;
  flex-direction: column;
  width: 100%;
}

:deep(.category-card .ant-card-head) {
  min-height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

:deep(.category-card .ant-card-body) {
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  min-height: 150px;
  background: #fafafa; /* 与 topics-list-wrapper 背景色保持一致 */
}

/* 专题列表容器 */
.topics-list-wrapper {
  max-height: 300px;
  overflow-y: auto;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
  transition: max-height 0.3s ease-in-out;
  flex: 1;
  min-width: 0;
}

.topics-list-wrapper.expanded {
  max-height: 1000px;
}

/* 专题列表 */
.topics-list {
  padding: 12px;
  min-width: 0;
  min-height: 50px;
  background: transparent; /* 确保背景透明 */
}

/* 空状态样式 */
.empty-topics {
  margin: 0;
  padding: 16px 0;
  background: transparent; /* 改为透明背景 */
  border: 1px dashed #f0f0f0;
  border-radius: 4px;
  text-align: center;
}

/* 滚动条样式 */
.topics-list-wrapper::-webkit-scrollbar {
  width: 6px;
}

.topics-list-wrapper::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.topics-list-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

/* 专题卡片样式 */
.topic-card {
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 8px;
  min-width: 0;
}

.topic-card:last-child {
  margin-bottom: 0;
}

.topic-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

/* 空状态样式 */
.empty-topics {
  margin: 0;
  padding: 32px 0;
  background: #fff;
  border: 1px dashed #f0f0f0;
  border-radius: 4px;
  text-align: center;
  min-height: 100px; /* 添加最小高度 */
}

/* 拖拽相关样式 */
:deep(.sortable-drag) {
  background: #fff !important;
  border: 1px solid #1890ff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

:deep(.sortable-ghost) {
  opacity: 0.5;
  background: #e6f7ff !important;
  border: 1px dashed #1890ff !important;
}

:deep(.sortable-fallback) {
  display: none;
}

:deep(.sortable-chosen) {
  background: #fff;
}

/* 拖拽时的目标区域高亮 */
:deep(.sortable-drag-area) {
  min-height: 100px;
  border: 2px dashed #1890ff;
  border-radius: 4px;
  background: rgba(24, 144, 255, 0.1);
  margin: 8px 0;
}

/* 专题列表容器在拖拽时的样式 */
.topics-list-wrapper.dragging {
  background: rgba(24, 144, 255, 0.05);
  border: 1px dashed #1890ff;
}

/* 折叠过渡效果 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease-in-out;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0.7;
  max-height: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 1000px;
}

/* 卡片头部样式 */
.category-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.category-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.category-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
}

:deep(.category-actions .ant-btn) {
  padding: 4px;
  height: 24px;
  width: 24px;
  min-width: 24px;
  line-height: 24px;
}

/* 专题卡片样式 */
.topic-card {
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 8px;
  min-width: 0;
}

.topic-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.topic-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.topic-slug {
  color: #8c8c8c;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  flex-shrink: 0;
}

.topic-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.topic-card:hover .topic-actions {
  opacity: 1;
}

.category-drag-handle {
  color: #bfbfbf;
  cursor: move;
  padding: 4px;
  margin-right: 4px;
}

.category-drag-handle:hover {
  color: #1890ff;
}

.topic-drag-handle {
  color: #bfbfbf;
  cursor: move;
  padding: 4px;
  margin-right: 4px;
}

.topic-drag-handle:hover {
  color: #1890ff;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 32px;
}

.category-form {
  flex: 1;
  display: flex;
  align-items: center;
  margin: 0;
}

:deep(.ant-form) {
  margin: 0 !important;
}

:deep(.ant-form-item) {
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
}

:deep(.ant-form-item-label) {
  padding: 0 8px 0 0;
  height: 32px;
  line-height: 32px;
  white-space: nowrap;
}

:deep(.ant-form-item-control) {
  line-height: 32px;
  flex: 1;
}

/* 调整表单项的间距 */
:deep(.ant-form-inline .ant-form-item) {
  margin-right: 16px;
}

:deep(.ant-form-inline .ant-form-item:last-child) {
  margin-right: 24px;
}

/* 调整输入框宽度和高度 */
:deep(.ant-form-inline .ant-form-item-control-input) {
  min-width: 180px;
}

:deep(.ant-input) {
  height: 32px;
  line-height: 32px;
}

:deep(.ant-btn) {
  height: 32px;
  line-height: 30px;
  padding: 0 16px;
}

.view-controls {
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 32px;
}

.view-label {
  color: #595959;
  font-size: 14px;
  margin-right: 8px;
  line-height: 32px;
  height: 32px;
  display: flex;
  align-items: center;
}

:deep(.ant-select) {
  height: 32px;
  line-height: 32px;
}

:deep(.ant-select-selector) {
  height: 32px !important;
  line-height: 32px !important;
}

:deep(.ant-select-selection-item) {
  line-height: 30px !important;
}

/* 展开图标动画 */
.expand-icon {
  transition: transform 0.3s;
  font-size: 12px;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.modal-header {
  width: 100%;
  margin: -20px -24px;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 32px;
}

.modal-title span {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.view-label {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

:deep(.ant-select-small) {
  font-size: 12px;
}

:deep(.ant-select-small .ant-select-selector) {
  height: 24px !important;
  padding: 0 8px !important;
}

:deep(.ant-select-small .ant-select-selection-item) {
  line-height: 22px !important;
}

:deep(.ant-btn-sm) {
  font-size: 12px;
  height: 24px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

:deep(.ant-modal-header) {
  margin-bottom: 0;
  padding: 0;
  border-bottom: none;
}

:deep(.ant-modal-title) {
  margin-right: 0;
}

.category-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  color: #666;
  font-size: 12px;
  padding: 0 8px;
  height: 20px;
  border-radius: 10px;
  font-weight: normal;
  min-width: 20px;
}
</style>
