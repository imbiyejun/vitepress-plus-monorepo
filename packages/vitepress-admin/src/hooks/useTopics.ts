import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { Topic, Category } from '@/types/topic'

export function useTopics() {
  const categories = ref<Category[]>([])
  const selectedCategory = ref<Category | null>(null)
  const selectedTopic = ref<Topic | null>(null)
  const loading = ref(false)
  const currentTopics = ref<Topic[]>([])

  // 监听 selectedCategory 的变化
  watch(
    () => selectedCategory.value,
    newCategory => {
      currentTopics.value = newCategory?.topics || []
    },
    { immediate: true }
  )

  const loadTopics = async () => {
    loading.value = true
    try {
      const response = await fetch('/api/categories')
      if (!response.ok) {
        throw new Error('加载数据失败')
      }

      const result = await response.json()
      const loadedCategories = result.data?.categories || result.categories

      if (!loadedCategories || !Array.isArray(loadedCategories)) {
        throw new Error('加载的数据格式不正确')
      }

      // 保存当前选中的分类ID和slug
      const currentCategoryId = selectedCategory.value?.id
      const currentCategorySlug = selectedCategory.value?.slug

      // 使用新数组替换原有数组，确保触发响应式更新
      categories.value = [...loadedCategories]

      // 如果之前有选中的分类，尝试保持选中状态
      if (currentCategoryId && currentCategorySlug) {
        const category = loadedCategories.find(
          c => c.id === currentCategoryId || c.slug === currentCategorySlug
        )
        if (category) {
          // 强制创建新对象以触发响应式更新
          selectedCategory.value = JSON.parse(JSON.stringify(category))
        } else {
          // 如果找不到之前选中的分类，则清空选中状态
          selectedCategory.value = null
          // 移除这个错误提示，因为在更新分类时不应该显示
          // message.error('之前选中的分类已不存在11')
        }
      }
      // 如果没有选中的分类，且需要默认选中第一个分类
      else if (loadedCategories.length > 0 && !selectedCategory.value) {
        selectedCategory.value = JSON.parse(JSON.stringify(loadedCategories[0]))
      }

      // 如果有选中的专题，确保它在新加载的数据中仍然存在
      if (selectedTopic.value) {
        const topicId = selectedTopic.value.id
        let found = false

        // 在所有分类中查找该专题
        for (const category of loadedCategories) {
          const topic = category.topics.find((t: Topic) => t.id === topicId)
          if (topic) {
            selectedCategory.value = JSON.parse(JSON.stringify(category))
            selectedTopic.value = JSON.parse(JSON.stringify(topic))
            found = true
            break
          }
        }

        // 如果找不到之前选中的专题，则清空选中状态
        if (!found) {
          selectedTopic.value = null
          message.error('之前选中的专题已不存在')
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      message.error('加载数据失败')
    } finally {
      loading.value = false
    }
  }

  // 确保数据已加载
  const ensureDataLoaded = async () => {
    if (categories.value.length === 0) {
      await loadTopics()
    }
  }

  const selectCategory = async (categoryId: string) => {
    await ensureDataLoaded()
    const category = categories.value.find(c => c.id === categoryId)
    if (category) {
      selectedCategory.value = { ...category }
    }
  }

  const selectTopic = async (topicId: string) => {
    await ensureDataLoaded()

    // 在所有分类中查找专题
    for (const category of categories.value) {
      const topic = category.topics.find(t => t.id === topicId)
      if (topic) {
        selectedCategory.value = { ...category } // 先更新选中的分类
        selectedTopic.value = { ...topic } // 再更新选中的专题
        return
      }
    }

    // 如果没有找到专题，清空选中状态
    selectedTopic.value = null
    message.error('未找到指定的专题')
  }

  const refreshTopics = async () => {
    await loadTopics()
  }

  const addCategory = async (name: string, slug: string) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: name, slug }) // 发送时使用title，因为后端期望title字段
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '添加专题大类失败')
      }

      const result = await response.json()
      if (result.message) {
        message.success(result.message)
      } else {
        message.success('添加专题大类成功')
      }
      await refreshTopics()
      return result.data || result
    } catch (error) {
      console.error('添加专题大类失败:', error)
      throw error
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '删除专题大类失败')
      }

      const result = await response.json()
      if (result.message) {
        message.success(result.message)
      } else {
        message.success('删除专题大类成功')
      }
      await refreshTopics()
    } catch (error) {
      console.error('删除专题大类失败:', error)
      throw error
    }
  }

  const updateCategoriesOrder = async (categoryIds: string[]) => {
    try {
      const response = await fetch('/api/categories/order/batch', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ categories: categoryIds })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '更新分类顺序失败')
      }

      const result = await response.json()
      if (result.message) {
        message.success(result.message)
      } else {
        message.success('更新分类顺序成功')
      }
      await refreshTopics()
    } catch (error) {
      console.error('更新分类顺序失败:', error)
      throw error
    }
  }

  const addTopic = async (topicData: {
    name: string
    categoryId: string
    description?: string
    image?: string
    slug: string
  }) => {
    try {
      const response = await fetch('/api/categories/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(topicData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '添加专题失败')
      }

      const result = await response.json()
      if (result.message) {
        message.success(result.message)
      } else {
        message.success('添加专题成功')
      }
      // 先刷新数据
      await loadTopics()
      // 确保选中正确的分类
      const category = categories.value.find(c => c.id === topicData.categoryId)
      if (category) {
        selectedCategory.value = category
      }
      return result.data || result
    } catch (error) {
      console.error('添加专题失败:', error)
      throw error
    }
  }

  const deleteTopic = async (slug: string) => {
    try {
      loading.value = true
      const response = await fetch(`/api/topic/${slug}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '删除专题失败')
      }

      const result = await response.json()

      // 如果删除的是当前选中的专题，清空选中状态
      if (selectedTopic.value?.id === slug) {
        selectedTopic.value = null
      }

      // 保存当前选中的分类信息
      const currentCategory = selectedCategory.value ? { ...selectedCategory.value } : null

      await refreshTopics()

      // 恢复选中的分类
      if (currentCategory) {
        const category = categories.value.find(c => c.id === currentCategory.id)
        if (category) {
          selectedCategory.value = { ...category }
        }
      }

      if (result.message) {
        message.success(result.message)
      } else {
        message.success('删除专题成功')
      }
    } catch (error) {
      console.error('删除专题失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    categories,
    selectedCategory,
    selectedTopic,
    currentTopics,
    loading,
    loadTopics,
    selectCategory,
    selectTopic,
    refreshTopics,
    addCategory,
    deleteCategory,
    updateCategoriesOrder,
    addTopic,
    deleteTopic
  }
}
