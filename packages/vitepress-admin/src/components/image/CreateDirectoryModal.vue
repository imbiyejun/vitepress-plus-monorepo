<template>
  <a-modal
    v-model:open="visible"
    title="创建目录"
    :confirm-loading="loading"
    @ok="handleCreate"
    @cancel="handleCancel"
  >
    <div class="create-directory-form">
      <div class="form-item">
        <label class="form-label">目录名</label>
        <a-input
          v-model:value="directoryName"
          placeholder="请输入目录名称"
          :status="errorMessage ? 'error' : ''"
          @press-enter="handleCreate"
        />
      </div>
      <div class="form-help">
        不支持仅由英文句号 . 组成的名称；不支持以 / 开头，不能包含连续的 /。
      </div>
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  currentPath?: string
}

interface Emits {
  (e: 'success', directoryName: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = ref(false)
const loading = ref(false)
const directoryName = ref('')
const errorMessage = ref('')

// Validate directory name
const validateDirectoryName = (name: string): string | null => {
  if (!name.trim()) {
    return '目录名称不能为空'
  }

  // Check if name consists only of dots
  if (/^\.+$/.test(name)) {
    return '不支持仅由英文句号 . 组成的名称'
  }

  // Check if starts with /
  if (name.startsWith('/')) {
    return '不支持以 / 开头'
  }

  // Check for consecutive slashes
  if (name.includes('//')) {
    return '不能包含连续的 /'
  }

  // Check for invalid characters
  if (/[<>:"|?*]/.test(name)) {
    return '目录名称包含非法字符'
  }

  return null
}

const handleCreate = async () => {
  const trimmedName = directoryName.value.trim()
  const validationError = validateDirectoryName(trimmedName)

  if (validationError) {
    errorMessage.value = validationError
    return
  }

  errorMessage.value = ''
  emit('success', trimmedName)
}

const handleCancel = () => {
  visible.value = false
  directoryName.value = ''
  errorMessage.value = ''
  loading.value = false
}

const show = () => {
  visible.value = true
  directoryName.value = ''
  errorMessage.value = ''
}

// Expose methods for parent component
defineExpose({
  show,
  handleCancel
})
</script>

<style scoped>
.create-directory-form {
  padding: 8px 0;
}

.form-item {
  margin-bottom: 12px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #262626;
}

.form-help {
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.5;
  margin-top: 8px;
}

.error-message {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 8px;
}
</style>
