<template>
  <a-modal
    :open="modelValue"
    :title="mode === 'edit' ? '编辑专题' : '添加专题'"
    @ok="handleSubmit"
    :maskClosable="false"
    :destroyOnClose="true"
    @update:open="handleOpenChange"
  >
    <a-form
      ref="topicForm"
      :model="formData"
      layout="horizontal"
      :label-col="{ span: 4 }"
      :wrapper-col="{ span: 20 }"
    >
      <a-form-item
        name="name"
        label="专题名称"
        :rules="[{ required: true, message: '请输入专题名称' }]"
        :validate-status="validationState.nameError ? 'error' : ''"
        :help="validationState.nameError"
        required
      >
        <a-input
          v-model:value="formData.name"
          placeholder="请输入专题名称"
          autocomplete="off"
          :status="validationState.nameError ? 'error' : ''"
        />
      </a-form-item>
      <a-form-item
        name="slug"
        label="专题标识"
        :rules="[{ required: true, message: '请输入专题标识' }]"
        :validate-status="validationState.slugError ? 'error' : ''"
        :help="validationState.slugError"
        required
      >
        <a-input
          v-model:value="formData.slug"
          placeholder="请输入专题标识（英文或拼音）"
          autocomplete="off"
          :disabled="mode === 'edit'"
          :status="validationState.slugError ? 'error' : ''"
        />
      </a-form-item>
      <a-form-item
        name="categoryId"
        label="所属大类"
        :rules="[{ required: true, message: '请选择所属大类' }]"
        required
      >
        <a-select v-model:value="formData.categoryId" placeholder="请选择所属大类">
          <a-select-option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item name="description" label="专题描述">
        <a-textarea
          v-model:value="formData.description"
          placeholder="请输入专题描述"
          :rows="3"
          autocomplete="off"
        />
      </a-form-item>
      <a-form-item name="image" label="专题图标">
        <image-uploader
          v-model="formData.image"
          :allow-storage-switch="true"
          :storage-type="'local'"
          :upload-path="'images/topics'"
          width="104px"
          height="104px"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { Category, Topic } from '@/types/topic'
import ImageUploader from '@/components/common/ImageUploader.vue'

const props = defineProps<{
  modelValue: boolean
  categories: Category[]
  defaultCategoryId?: string
  topic?: Topic | null
  mode?: 'add' | 'edit'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (
    e: 'submit',
    formData: {
      name: string
      slug: string
      categoryId: string
      description: string
      image: string
    }
  ): void
}>()

const topicForm = ref()
const formData = ref({
  name: '',
  categoryId: props.defaultCategoryId || undefined,
  description: '',
  image: '',
  slug: ''
})

// 添加校验状态
const validationState = ref({
  nameError: '',
  slugError: ''
})

// 防抖函数
const debounce = <T extends unknown[]>(fn: (...args: T) => void, delay: number) => {
  let timer: NodeJS.Timeout | null = null
  return (...args: T) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

// 检查单个字段是否重复
const checkFieldDuplicate = (field: 'name' | 'slug', value: string) => {
  if (!value) return false

  const allTopics: Topic[] = []
  props.categories.forEach(category => {
    allTopics.push(...category.topics)
  })

  const otherTopics =
    props.mode === 'edit' && props.topic
      ? allTopics.filter(t => t.id !== props.topic?.id)
      : allTopics

  if (field === 'name') {
    const duplicate = otherTopics.some(t => t.title?.toLowerCase() === value.toLowerCase())
    console.log('Name check result:', duplicate)
    return duplicate
  } else {
    const duplicate = otherTopics.some(t => (t.slug || t.id)?.toLowerCase() === value.toLowerCase())
    console.log('Slug check result:', duplicate)
    return duplicate
  }
}

// 实时校验函数
const validateField = debounce((field: 'name' | 'slug', value: string) => {
  console.log('Validating field:', field, 'value:', value) // 添加调试日志
  const isDuplicate = checkFieldDuplicate(field, value)
  if (isDuplicate) {
    validationState.value[`${field}Error`] = `该专题${field === 'name' ? '名称' : '标识'}已存在`
  } else {
    validationState.value[`${field}Error`] = ''
  }
  console.log('Validation state:', validationState.value) // 添加调试日志
}, 300)

// 监听名称变化
watch(
  () => formData.value.name,
  newValue => {
    validateField('name', newValue)
  }
)

// 监听标识变化
watch(
  () => formData.value.slug,
  newValue => {
    validateField('slug', newValue)
  }
)

// 监听默认分类ID的变化
watch(
  () => props.defaultCategoryId,
  newVal => {
    formData.value.categoryId = newVal || undefined
  },
  { immediate: true }
)

// 监听 topic 的变化，更新表单数据
watch(
  () => props.topic,
  newTopic => {
    if (newTopic) {
      formData.value = {
        name: newTopic.title || '',
        categoryId: newTopic.categoryId || props.defaultCategoryId || undefined,
        description: newTopic.description || '',
        image: newTopic.icon || '',
        slug: newTopic.slug || newTopic.id || ''
      }
    } else {
      formData.value = {
        name: '',
        categoryId: props.defaultCategoryId || undefined,
        description: '',
        image: '',
        slug: ''
      }
    }
  },
  { immediate: true }
)

// 处理弹窗打开状态变化
const handleOpenChange = (val: boolean) => {
  emit('update:modelValue', val)
  if (!val) {
    // 弹窗关闭时重置表单和文件列表
    topicForm.value?.resetFields()
    formData.value = {
      name: '',
      categoryId: props.defaultCategoryId || undefined,
      description: '',
      image: '',
      slug: ''
    }
    validationState.value = {
      nameError: '',
      slugError: ''
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  try {
    await topicForm.value?.validate()
    // 确保 categoryId 存在
    if (!formData.value.categoryId) {
      return
    }

    // 检查是否有重复错误
    if (validationState.value.nameError || validationState.value.slugError) {
      if (validationState.value.nameError) {
        message.error(validationState.value.nameError)
      } else if (validationState.value.slugError) {
        message.error(validationState.value.slugError)
      }
      return
    }

    await emit('submit', {
      name: formData.value.name,
      slug: formData.value.slug,
      categoryId: formData.value.categoryId,
      description: formData.value.description,
      image: formData.value.image
    })

    // 重置表单和验证状态
    formData.value = {
      name: '',
      categoryId: props.defaultCategoryId || undefined,
      description: '',
      image: '',
      slug: ''
    }
    validationState.value = {
      nameError: '',
      slugError: ''
    }
    topicForm.value?.resetFields()
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'errorFields' in error && error.errorFields) {
      // 表单验证错误，不需要显示消息
      return
    }
    throw error
  }
}
</script>

<style scoped>
/* No custom styles needed - all handled by ImageUploader component */
</style>
