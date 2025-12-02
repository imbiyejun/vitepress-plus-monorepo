<template>
  <div class="topic-manager">
    <Transition>
      <div v-if="!collapsed" class="topic-sidebar">
        <div class="sidebar-header">
          <div class="header-actions">
            <a-button type="primary" size="small" @click="showAddTopicModal">
              <PlusOutlined />添加专题
            </a-button>
            <a-button type="primary" size="small" @click="showAddCategory">
              <PlusOutlined />添加大类
            </a-button>
            <a-tooltip title="管理分类">
              <a-button size="small" @click="showCategoryModal">
                <SettingOutlined />
              </a-button>
            </a-tooltip>
          </div>
        </div>

        <CategoryList
          :categories="categories"
          :selected-category-slug="route.query.category as string"
          @select="handleCategorySelect"
          @edit="handleEditCategory"
          @delete="handleDeleteCategory"
        />

        <TopicTree
          :topics="currentTopics"
          :selectedTopicId="route.query.topic as string"
          @select="handleTopicSelect"
          @delete="handleTopicDelete"
          @edit="handleTopicEdit"
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

    <div :class="['topic-content', { 'content-expanded': collapsed }]">
      <TopicEdit v-if="route.query.topic" />
      <div v-else class="empty-state">
        <p>请选择一个专题进行编辑</p>
      </div>
    </div>

    <!-- 添加专题弹窗 -->
    <TopicFormModal
      v-model="addTopicVisible"
      :categories="categories"
      :defaultCategoryId="selectedCategory?.id"
      @submit="handleAddTopic"
    />

    <!-- 编辑专题弹窗 -->
    <TopicFormModal
      v-model="editTopicVisible"
      :categories="categories"
      :topic="editingTopic"
      mode="edit"
      @submit="handleTopicSubmit"
    />

    <!-- 管理分类弹窗 -->
    <CategoryManagerModal
      v-model="categoryModalVisible"
      :categories="categories"
      @add-category="handleAddCategory"
      @remove-category="handleRemoveCategory"
      @update-category="handleUpdateCategory"
      @save="handleSaveCategories"
      @topic-updated="loadTopics"
    />

    <!-- 编辑分类弹窗 -->
    <CategoryEditModal
      v-if="editModalVisible"
      v-model="editModalVisible"
      :category="editingCategory"
      :categories="categories"
      :mode="editingCategory ? 'edit' : 'add'"
      @submit="handleCategorySubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PlusOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { useTopics } from '../../hooks/useTopics'
import TopicTree from '../../components/topic/TopicTree.vue'
import TopicFormModal from '../../components/topic/TopicFormModal.vue'
import CategoryManagerModal from '../../components/category/CategoryManagerModal.vue'
import CategoryEditModal from '../../components/category/CategoryEditModal.vue'
import type { Topic, Category } from '@/types/topic'
import emitter from '@/utils/eventBus'
import TopicEdit from '../../components/topic/TopicEdit.vue'
import CategoryList from '../../components/category/CategoryList.vue'
import { topicApi, categoryApi } from '@/services/api'

const route = useRoute()
const router = useRouter()
const {
  categories,
  selectedCategory,
  currentTopics,
  loadTopics,
  selectCategory,
  addCategory,
  deleteCategory,
  addTopic,
  selectTopic,
  deleteTopic,
  selectedTopic
} = useTopics()

const addTopicVisible = ref(false)
const editTopicVisible = ref(false)
const editingTopic = ref<Topic | null>(null)
const categoryModalVisible = ref(false)
const collapsed = ref(false)
const editModalVisible = ref(false)
const editingCategory = ref<Category | null>(null)

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}

// 处理分类选择
const handleCategorySelect = async (categoryId: string) => {
  const category = categories.value.find(c => c.id === categoryId)
  if (!category) return

  // 先选中分类
  await selectCategory(category.id)

  // 如果该分类下有专题，自动选中第一个专题并更新路由
  if (category.topics.length > 0) {
    const firstTopic = category.topics[0]
    await selectTopic(firstTopic.id)
    await router.push({
      path: '/topics',
      query: { category: category.slug, topic: firstTopic.id }
    })
  } else {
    // 如果没有专题，只导航到分类页面
    await router.push({
      path: '/topics',
      query: { category: category.slug }
    })
  }
}

// 处理专题选择
const handleTopicSelect = async (topicId: string) => {
  const categorySlug = route.query.category as string
  if (!categorySlug) return

  console.log('Selecting topic:', topicId) // 添加日志

  // 更新选中的专题
  await selectTopic(topicId)

  // 更新路由
  await router.push({
    path: '/topics',
    query: { category: categorySlug, topic: topicId }
  })
}

// 显示添加专题大类弹窗
const showAddCategory = () => {
  editingCategory.value = null
  editModalVisible.value = true
}

// 监听编辑分类弹窗的关闭
watch(editModalVisible, newValue => {
  if (!newValue) {
    // 弹窗关闭时重置状态
    editingCategory.value = null
  }
})

// 显示添加专题弹窗
const showAddTopicModal = () => {
  addTopicVisible.value = true
}

// 显示分类管理弹窗
const showCategoryModal = () => {
  categoryModalVisible.value = true
}

// 处理专题大类提交（添加或更新）
const handleCategorySubmit = async (id: string | null, name: string, slug: string) => {
  try {
    if (id) {
      // 更新分类
      await handleUpdateCategory(id, name, slug)
    } else {
      // 添加分类
      await handleAddCategory(name, slug)
    }
    // 关闭弹窗并重置状态
    editModalVisible.value = false
    editingCategory.value = null
  } catch (error) {
    console.error('操作专题大类失败:', error)
    message.error(error instanceof Error ? error.message : '操作专题大类失败')
  }
}

// 处理添加专题
const handleAddTopic = async (topicData: {
  name: string
  slug: string
  categoryId: string
  description: string
  image: string
}) => {
  try {
    const result = await addTopic(topicData)
    addTopicVisible.value = false

    // 导航到新创建的专题
    const category = categories.value.find(c => c.id === result.categoryId)
    if (category) {
      await router.push({
        path: '/topics',
        query: { category: category.slug, topic: result.id }
      })
    }
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : '添加专题失败')
  }
}

// 处理专题删除
const handleTopicDelete = (topic: Topic) => {
  if (topic.articleCount && topic.articleCount > 0) {
    message.warning(`该专题下还有 ${topic.articleCount} 篇文章，无法删除`)
    return
  }

  // 如果删除的是当前选中的专题，需要处理跳转逻辑
  if (selectedTopic.value?.id === topic.id) {
    const currentCategory = selectedCategory.value
    if (currentCategory) {
      // 找到当前专题的索引
      const currentIndex = currentCategory.topics.findIndex(t => t.id === topic.id)
      // 获取要跳转的专题（优先选择上一个，如果没有上一个就选下一个）
      const targetTopic =
        currentCategory.topics[currentIndex - 1] || currentCategory.topics[currentIndex + 1]

      // 删除专题
      deleteTopic(topic.id)
        .then(async () => {
          // 如果找到目标专题，跳转到该专题
          if (targetTopic) {
            await selectTopic(targetTopic.id)
            await router.push({
              path: '/topics',
              query: { category: currentCategory.slug, topic: targetTopic.id }
            })
          } else {
            // 如果没有其他专题了，只导航到分类页面
            await router.push({
              path: '/topics',
              query: { category: currentCategory.slug }
            })
          }
        })
        .catch(error => {
          console.error(error)
        })
    }
  } else {
    // 如果删除的不是当前选中的专题，直接删除即可
    deleteTopic(topic.id).catch(error => {
      console.error(error)
    })
  }
}

// 处理专题编辑
const handleTopicEdit = (topic: Topic) => {
  editingTopic.value = {
    id: topic.id,
    title: topic.title,
    description: topic.description,
    icon: topic.icon,
    categoryId: topic.categoryId,
    slug: topic.slug || topic.id
  }
  editTopicVisible.value = true
}

// 处理专题提交（编辑）
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
      route.query.topic === editingTopic.value?.id
    ) {
      // 找到新分类的 slug
      const newCategory = categories.value.find(c => c.id === formData.categoryId)
      if (newCategory) {
        // 更新路由到新分类
        await router.push({
          path: '/topics',
          query: { category: newCategory.slug, topic: editingTopic.value?.id }
        })
      }
    }

    // 刷新数据
    await loadTopics()

    // 在数据刷新完成后发出更新事件
    if (editingTopic.value?.id) {
      emitter.emit('topic-updated', editingTopic.value.id)
    }

    editTopicVisible.value = false
  } catch (error) {
    console.error('更新专题失败:', error)
    message.error(error instanceof Error ? error.message : '更新专题失败')
  }
}

// 处理添加分类
const handleAddCategory = async (name: string, slug: string) => {
  try {
    const result = await addCategory(name, slug)
    await loadTopics()
    return result
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : '添加专题大类失败')
    throw error
  }
}

// 处理删除分类
const handleRemoveCategory = async (categoryId: string) => {
  try {
    await deleteCategory(categoryId)
    if (selectedCategory.value?.id === categoryId && categories.value.length > 0) {
      // 如果删除的是当前选中的分类，选中第一个分类
      await selectCategory(categories.value[0].id)
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除专题大类失败')
  }
}

// 处理更新分类
const handleUpdateCategory = async (categoryId: string, name: string, slug: string) => {
  try {
    await categoryApi.updateCategory(categoryId, { title: name, slug })

    // 如果更新的是当前选中的分类，需要更新路由
    const isCurrentCategory = selectedCategory.value?.id === categoryId
    const currentTopicId = route.query.topic as string

    // 先更新数据
    await loadTopics()

    // 如果是当前分类，更新选中状态和路由
    if (isCurrentCategory) {
      // 先选中更新后的分类
      await selectCategory(slug)

      // 然后更新路由
      if (currentTopicId) {
        // 如果当前有选中的专题，更新到新的路由
        await router.replace({
          path: '/topics',
          query: { category: slug, topic: currentTopicId }
        })
      } else {
        // 如果只是在分类页面，更新到新的分类路由
        await router.replace({
          path: '/topics',
          query: { category: slug }
        })
      }

      // 强制重新加载数据
      await loadTopics()
    }

    message.success('更新专题大类成功')
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : '更新专题大类失败')
  }
}

// 处理保存分类
const handleSaveCategories = async (newCategories: Category[]) => {
  try {
    // 保存当前路由参数
    const currentCategorySlug = route.params.categorySlug as string
    const currentTopicSlug = route.params.topicSlug as string

    // 更新本地数据 (仅临时更新)
    // categories.value = newCategories

    // 获取所有分类的ID，按照当前顺序
    const categoryIds = newCategories.map(category => category.id)
    await categoryApi.updateCategoriesOrder(categoryIds)

    // 获取所有分类的专题顺序
    const topicsOrder = newCategories.map(category => ({
      categoryId: category.id,
      topicIds: category.topics.map((topic: { id: string }) => topic.id)
    }))

    await topicApi.updateTopicsOrder(topicsOrder)

    // 刷新数据
    await loadTopics()

    // 如果当前路由有专题参数
    if (currentTopicSlug) {
      // 在所有分类中查找该专题
      let found = false
      for (const category of categories.value) {
        const topic = category.topics.find(t => t.id === currentTopicSlug)
        if (topic) {
          // 如果找到专题，但它现在在不同的分类中
          if (category.slug !== currentCategorySlug) {
            // 更新路由到新的分类
            await router.push(`/topics/${category.slug}/${currentTopicSlug}`)
          }
          await selectCategory(category.id)
          await selectTopic(topic.id)
          found = true
          break
        }
      }

      // 如果找不到当前专题（可能已被删除）
      if (!found) {
        // 尝试保持在当前分类
        const currentCategory = categories.value.find(c => c.slug === currentCategorySlug)
        if (currentCategory && currentCategory.topics.length > 0) {
          // 选择当前分类的第一个专题
          const firstTopic = currentCategory.topics[0]
          await selectCategory(currentCategory.id)
          await selectTopic(firstTopic.id)
          await router.push(`/topics/${currentCategory.slug}/${firstTopic.id}`)
        } else {
          // 如果当前分类没有专题，选择第一个有专题的分类
          const firstCategoryWithTopics = categories.value.find(c => c.topics.length > 0)
          if (firstCategoryWithTopics) {
            const firstTopic = firstCategoryWithTopics.topics[0]
            await selectCategory(firstCategoryWithTopics.id)
            await selectTopic(firstTopic.id)
            await router.push(`/topics/${firstCategoryWithTopics.slug}/${firstTopic.id}`)
          }
        }
      }
    }

    message.success('保存成功')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  }
}

// 显示编辑分类弹窗
const handleEditCategory = (category: Category) => {
  editingCategory.value = category
  editModalVisible.value = true
}

// 处理删除分类
const handleDeleteCategory = (category: Category) => {
  if (category.topics.length > 0) {
    message.warning(`该分类下还有 ${category.topics.length} 个专题，无法删除`)
    return
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除分类"${category.name}"吗？此操作不可恢复。`,
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        // 记录当前是否在被删除的分类
        const isCurrentCategory = route.query.category === category.slug

        // 删除分类
        await deleteCategory(category.id)

        // 刷新分类列表
        await loadTopics()

        // 如果删除的是当前选中的分类且还有其他分类
        if (isCurrentCategory && categories.value.length > 0) {
          // 获取第一个分类
          const firstCategory = categories.value[0]

          // 如果第一个分类有专题
          if (firstCategory.topics.length > 0) {
            const firstTopic = firstCategory.topics[0]
            // 先更新路由
            await router.replace({
              path: '/topics',
              query: {
                category: firstCategory.slug,
                topic: firstTopic.id
              }
            })
            // 然后更新选中状态
            await selectCategory(firstCategory.id)
            await selectTopic(firstTopic.id)
          } else {
            // 如果没有专题，只导航到分类
            await router.replace({
              path: '/topics',
              query: { category: firstCategory.slug }
            })
            await selectCategory(firstCategory.id)
          }
        }
      } catch (error) {
        console.error('删除分类失败:', error)
        message.error('删除分类失败')
      }
    }
  })
}

// 修改 onMounted 中的初始化逻辑
onMounted(async () => {
  // 加载所有分类和专题数据
  await loadTopics()

  // 获取当前的查询参数
  const categorySlug = route.query.category as string
  const topicSlug = route.query.topic as string

  // 如果 URL 中有分类参数
  if (categorySlug) {
    const category = categories.value.find(c => c.slug === categorySlug)
    if (category) {
      // 选中对应的分类
      await selectCategory(category.id)

      // 如果 URL 中有专题参数
      if (topicSlug) {
        const topic = category.topics.find(t => t.id === topicSlug)
        if (topic) {
          // 选中对应的专题
          await selectTopic(topic.id)
        } else {
          // 如果找不到对应的专题，但该分类下有其他专题
          if (category.topics.length > 0) {
            const firstTopic = category.topics[0]
            await selectTopic(firstTopic.id)
            // 更新 URL 到第一个专题
            await router.replace({
              path: '/topics',
              query: { category: categorySlug, topic: firstTopic.id }
            })
          } else {
            // 该分类下没有专题，清除专题参数
            await router.replace({
              path: '/topics',
              query: { category: categorySlug }
            })
          }
        }
      } else if (category.topics.length > 0) {
        // 没有专题参数但分类下有专题，选中第一个专题
        const firstTopic = category.topics[0]
        await selectTopic(firstTopic.id)
        await router.replace({
          path: '/topics',
          query: { category: categorySlug, topic: firstTopic.id }
        })
      }
    } else {
      // 找不到对应的分类，重定向到第一个分类
      if (categories.value.length > 0) {
        const firstCategory = categories.value[0]
        await selectCategory(firstCategory.id)
        if (firstCategory.topics.length > 0) {
          const firstTopic = firstCategory.topics[0]
          await selectTopic(firstTopic.id)
          await router.replace({
            path: '/topics',
            query: { category: firstCategory.slug, topic: firstTopic.id }
          })
        } else {
          await router.replace({
            path: '/topics',
            query: { category: firstCategory.slug }
          })
        }
      }
    }
  } else {
    // URL 中没有分类参数，默认选择第一个分类
    if (categories.value.length > 0) {
      const firstCategory = categories.value[0]
      await selectCategory(firstCategory.id)
      if (firstCategory.topics.length > 0) {
        const firstTopic = firstCategory.topics[0]
        await selectTopic(firstTopic.id)
        await router.replace({
          path: '/topics',
          query: { category: firstCategory.slug, topic: firstTopic.id }
        })
      } else {
        await router.replace({
          path: '/topics',
          query: { category: firstCategory.slug }
        })
      }
    }
  }
})

// 修改 watch 路由参数变化监听
watch(
  () => [route.query.category, route.query.topic],
  async ([newCategorySlug, newTopicSlug], [oldCategorySlug, oldTopicSlug]) => {
    console.log('Route params changed:', { newCategorySlug, newTopicSlug }) // 添加日志

    // 如果分类改变了
    if (newCategorySlug !== oldCategorySlug) {
      const category = categories.value.find(c => c.slug === newCategorySlug)
      if (category) {
        console.log('Selecting category:', category.id) // 添加日志
        await selectCategory(category.id)
      }
    }

    // 如果专题改变了
    if (newTopicSlug !== oldTopicSlug) {
      // 在所有分类中查找专题
      for (const category of categories.value) {
        const topic = category.topics.find(t => t.id === newTopicSlug)
        if (topic) {
          console.log('Selecting topic:', topic.id) // 添加日志
          await selectCategory(category.id) // 先选中正确的分类
          await selectTopic(topic.id) // 再选中专题
          break
        }
      }
    }
  }
)
</script>

<style scoped>
.topic-manager {
  display: flex;
  height: 100%;
  padding: 24px;
  background: #f0f2f5;
  position: relative;
  overflow: hidden;
}

.topic-sidebar {
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

.topic-sidebar.v-leave-active,
.topic-sidebar.v-enter-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.topic-sidebar.v-leave-to,
.topic-sidebar.v-enter-from {
  transform: translateX(-100%);
}

.sidebar-header {
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.topic-content {
  position: absolute;
  left: 328px;
  right: 24px;
  top: 24px;
  bottom: 24px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
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
