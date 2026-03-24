<template>
  <a-input
    ref="inputRef"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :status="status"
    :size="size"
    autocomplete="off"
    @update:value="handleInput"
    @pressEnter="emit('pressEnter', $event)"
    @blur="emit('blur', $event)"
  >
    <template #suffix>
      <a-tooltip :title="generating ? '正在生成...' : '自动生成标识'">
        <span
          class="generate-icon"
          :class="{ generating, disabled: disabled || !sourceText }"
          @mousedown.prevent
          @click="handleGenerate"
        >
          <ThunderboltOutlined :class="{ 'icon-pulse': generating }" />
        </span>
      </a-tooltip>
    </template>
  </a-input>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ThunderboltOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { translateApi } from '@/services/api'

interface Props {
  modelValue: string
  sourceText: string // Text to translate (e.g., name/title)
  placeholder?: string
  disabled?: boolean
  status?: '' | 'error' | 'warning'
  size?: 'large' | 'middle' | 'small'
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请输入标识',
  disabled: false,
  status: '',
  size: 'middle'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'generated', value: string): void
  (e: 'pressEnter', event: KeyboardEvent): void
  (e: 'blur', event: Event): void
}>()

const inputRef = ref<{ focus: () => void } | null>(null)
const generating = ref(false)

const canGenerate = computed(
  () => !props.disabled && !!props.sourceText?.trim() && !generating.value
)

const handleInput = (value: string) => {
  emit('update:modelValue', value)
}

const handleGenerate = async () => {
  if (!canGenerate.value) return

  generating.value = true

  try {
    const result = await translateApi.toSlug(props.sourceText.trim())
    if (result.slug) {
      emit('update:modelValue', result.slug)
      emit('generated', result.slug)
      // Focus the input after generation
      setTimeout(() => {
        inputRef.value?.focus()
      }, 100)
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : '生成失败'
    message.error(msg)
  } finally {
    generating.value = false
  }
}

defineExpose({
  focus: () => inputRef.value?.focus()
})
</script>

<style scoped>
.generate-icon {
  cursor: pointer;
  color: #1890ff;
  font-size: 14px;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.generate-icon:hover:not(.disabled) {
  background-color: rgba(24, 144, 255, 0.1);
}

.generate-icon.disabled {
  cursor: not-allowed;
  color: #d9d9d9;
}

.generate-icon.generating {
  cursor: wait;
  color: #1890ff;
}

/* Pulse animation for generating state */
.icon-pulse {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
