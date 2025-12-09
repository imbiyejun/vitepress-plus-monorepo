<template>
  <a-modal
    v-model:open="visible"
    title="选择图片"
    width="1200px"
    :footer="null"
    :maskClosable="false"
    @cancel="handleCancel"
  >
    <div class="image-selector">
      <!-- Storage type switcher -->
      <div class="storage-switcher">
        <a-radio-group v-model:value="currentStorage" button-style="solid">
          <a-radio-button value="local">本地图片</a-radio-button>
          <a-radio-button value="qiniu">七牛云图片</a-radio-button>
        </a-radio-group>
      </div>

      <!-- Image list based on storage type -->
      <div class="image-list-container">
        <local-image-list
          v-if="currentStorage === 'local'"
          ref="localListRef"
          :selection-mode="true"
          @select="handleImageSelect"
        />
        <qiniu-image-list
          v-else
          ref="qiniuListRef"
          :selection-mode="true"
          @select="handleImageSelect"
        />
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LocalImageList from '@/views/images/LocalImageList.vue'
import QiniuImageList from '@/views/images/QiniuImageList.vue'

const emit = defineEmits<{
  (e: 'select', imageUrl: string): void
}>()

const visible = ref(false)
const currentStorage = ref<'local' | 'qiniu'>('local')
const localListRef = ref()
const qiniuListRef = ref()

const handleImageSelect = (imageUrl: string) => {
  emit('select', imageUrl)
  visible.value = false
}

const handleCancel = () => {
  visible.value = false
}

// Expose methods
defineExpose({
  show: () => {
    visible.value = true
  }
})
</script>

<style scoped>
.image-selector {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 500px;
}

.storage-switcher {
  display: flex;
  justify-content: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.image-list-container {
  flex: 1;
  overflow: auto;
  max-height: calc(100vh - 300px);
}
</style>
