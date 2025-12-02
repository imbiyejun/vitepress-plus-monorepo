<template>
  <a-modal
    :open="modelValue"
    :title="mode === 'edit' ? '更新专题大类' : '添加专题大类'"
    @ok="handleSubmit"
    :maskClosable="false"
    :destroyOnClose="true"
    @update:open="handleOpenChange"
  >
    <a-form
      ref="categoryForm"
      :model="formData"
      layout="horizontal"
      :label-col="{ span: 4 }"
      :wrapper-col="{ span: 20 }"
    >
      <a-form-item name="name" label="名称" :rules="categoryNameRules" required>
        <a-input
          v-model:value="formData.name"
          placeholder="请输入专题大类名称"
          autocomplete="off"
        />
      </a-form-item>
      <a-form-item name="slug" label="标识" :rules="categorySlugRules" required>
        <a-input
          v-model:value="formData.slug"
          placeholder="请输入专题大类标识（英文或拼音）"
          autocomplete="off"
          :disabled="mode === 'edit'"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, watch } from 'vue'
import type { Category } from '@/types/topic'

const props = defineProps<{
  modelValue: boolean
  category: Category | null
  categories: Category[]
  mode: 'add' | 'edit'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', id: string | null, name: string, slug: string): void
}>()

const categoryForm = ref()
const formData = ref({
  name: '',
  slug: ''
})

// 监听category的变化，更新表单数据
watch(
  () => props.category,
  newCategory => {
    if (newCategory) {
      formData.value.name = newCategory.name
      formData.value.slug = newCategory.slug
    } else {
      formData.value.name = ''
      formData.value.slug = ''
    }
  },
  { immediate: true }
)

// 分类名称验证规则
const categoryNameRules = [
  { required: true, message: '请输入专题大类名称' },
  { min: 2, message: '专题大类名称至少需要2个字符' },
  {
    validator: (_rule: unknown, value: string) => {
      if (!value) return Promise.resolve()
      const existingCategory = props.categories.find(
        category =>
          category.name.toLowerCase() === value.toLowerCase() && category.id !== props.category?.id
      )
      if (existingCategory) {
        return Promise.reject('专题大类名称已存在，请使用其他名称')
      }
      return Promise.resolve()
    }
  }
]

// 分类标识验证规则
const categorySlugRules = [
  { required: true, message: '请输入专题大类标识' },
  { min: 2, message: '专题大类标识至少需要2个字符' },
  { pattern: /^[a-z0-9-]+$/, message: '专题大类标识只能包含小写字母、数字和连字符' },
  {
    validator: (_rule: unknown, value: string) => {
      if (!value) return Promise.resolve()
      const existingCategory = props.categories.find(
        category =>
          category.slug.toLowerCase() === value.toLowerCase() && category.id !== props.category?.id
      )
      if (existingCategory) {
        return Promise.reject('专题大类标识已存在，请使用其他标识')
      }
      return Promise.resolve()
    }
  }
]

// 提交表单
const handleSubmit = async () => {
  try {
    await categoryForm.value?.validate()
    emit(
      'submit',
      props.category?.id || null,
      formData.value.name.trim(),
      formData.value.slug.trim()
    )
    emit('update:modelValue', false)
  } catch {
    // 表单验证错误，不需要处理
  }
}

// 处理弹窗打开状态变化
const handleOpenChange = (val: boolean) => {
  emit('update:modelValue', val)
  if (!val) {
    // 弹窗关闭时重置表单
    categoryForm.value?.resetFields()
  }
}
</script>
