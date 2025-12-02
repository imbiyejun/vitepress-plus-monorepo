<template>
  <div>
    <a-modal
      :open="visible"
      :title="title"
      :confirm-loading="loading"
      :maskClosable="false"
      :keyboard="false"
      @ok="handleOk"
      @cancel="handleCancel"
    >
      <div class="rename-form">
        <p>请输入新的图片名称：</p>
        <a-form-item :validate-status="validateStatus" :help="validateMessage">
          <a-input
            ref="inputRef"
            v-model:value="inputValue"
            :disabled="loading"
            @pressEnter="handleOk"
            @change="handleInputChange"
          />
        </a-form-item>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { message } from 'ant-design-vue'
import { checkImageName, checkQiniuImageName } from '@/services/images'
import { debounce } from 'lodash-es'

interface Props {
  title?: string
  currentPath?: string
  storageType?: 'local' | 'qiniu'
}

const props = withDefaults(defineProps<Props>(), {
  title: '重命名',
  currentPath: '',
  storageType: 'local'
})

const emit = defineEmits<{
  (e: 'ok', value: string): void
  (e: 'cancel'): void
}>()

const visible = ref(false)
const inputValue = ref('')
const originalValue = ref('') // 保存原始值用于比较
const inputRef = ref()
const loading = ref(false)
const validating = ref(false)
const error = ref('')

const validateStatus = computed(() => {
  if (validating.value) return 'validating'
  if (error.value) return 'error'
  if (inputValue.value && !error.value) return 'success'
  return ''
})

const validateMessage = computed(() => {
  if (validating.value) return '检查中...'
  if (error.value) return error.value
  if (inputValue.value && inputValue.value.trim() !== originalValue.value) return '名称可用'
  return ' ' // 使用空格而不是空字符串，保持占位
})

// 使用 debounce 避免频繁请求
const checkName = debounce(async (value: string) => {
  value = value.trim()
  if (!value || value === originalValue.value) {
    error.value = ''
    validating.value = false
    return
  }

  validating.value = true
  try {
    const isValid =
      props.storageType === 'qiniu'
        ? await checkQiniuImageName(props.currentPath, value)
        : await checkImageName(props.currentPath, value)
    error.value = isValid ? '' : '文件名已存在'
  } catch {
    error.value = '检查文件名失败'
  } finally {
    validating.value = false
  }
}, 300)

const handleInputChange = async (e: Event) => {
  const value = (e.target as HTMLInputElement).value
  if (!value) {
    error.value = '请输入文件名'
    return
  }
  await checkName(value)
}

watch(visible, async newVal => {
  if (newVal) {
    error.value = ''
    validating.value = false
    await nextTick()
    inputRef.value?.focus()
  }
})

const handleOk = async () => {
  if (loading.value || validating.value) return

  const value = inputValue.value.trim()
  if (!value) {
    error.value = '请输入文件名'
    message.error('请输入文件名')
    return
  }

  // 如果文件名未修改，直接提示并返回
  if (value === originalValue.value) {
    error.value = '文件名未修改'
    message.error('文件名未修改')
    return
  }

  if (error.value) {
    message.error(error.value)
    return
  }

  loading.value = true
  try {
    await emit('ok', inputValue.value)
    visible.value = false
    inputValue.value = ''
    error.value = ''
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  visible.value = false
  inputValue.value = ''
  error.value = ''
}

const show = (initialValue?: string) => {
  const value = initialValue || ''
  inputValue.value = value
  originalValue.value = value
  error.value = ''
  validating.value = false
  visible.value = true
}

const setError = (errorMessage: string) => {
  error.value = errorMessage
}

defineExpose({
  show,
  setError
})
</script>

<style scoped>
.rename-form {
  p {
    margin-bottom: 12px;
  }

  :deep(.ant-form-item) {
    margin-bottom: 0;
    min-height: 55px;
  }

  :deep(.ant-form-item-explain) {
    min-height: 22px;
  }
}
</style>
