<template>
  <div class="image-uploader" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Image preview or placeholder -->
    <div class="image-preview-container">
      <img v-if="modelValue" :src="modelValue" alt="preview" class="preview-image" />
      <div v-else class="preview-placeholder">
        <picture-outlined style="font-size: 32px; color: #d9d9d9" />
        <div class="placeholder-text">暂无图片</div>
      </div>

      <!-- Hover overlay with action buttons (only show when no image) -->
      <div v-if="!modelValue && (hovering || showActions)" class="action-overlay">
        <div class="action-buttons">
          <a-tooltip title="上传图片">
            <div class="action-btn" @click.stop="handleUploadClick">
              <upload-outlined class="action-icon" />
            </div>
          </a-tooltip>
          <a-tooltip title="选择已有图片">
            <div class="action-btn" @click.stop="handleSelectClick">
              <folder-open-outlined class="action-icon" />
            </div>
          </a-tooltip>
        </div>
      </div>

      <!-- Actions when image exists (show on hover) -->
      <div v-if="modelValue && (hovering || showActions)" class="image-actions-overlay">
        <!-- Preview button (center) -->
        <a-tooltip title="预览图片">
          <div class="preview-btn" @click.stop="handlePreview">
            <eye-outlined class="preview-icon" />
          </div>
        </a-tooltip>

        <!-- Clear button (top-right corner) -->
        <div class="clear-btn" @click.stop="handleClear">
          <a-tooltip title="清除图片">
            <close-circle-filled class="clear-icon" />
          </a-tooltip>
        </div>
      </div>
    </div>

    <!-- Upload modal -->
    <upload-modal
      ref="uploadModalRef"
      :allow-storage-switch="allowStorageSwitch"
      :storage-type="storageType"
      :upload-path="uploadPath"
      @success="handleUploadSuccess"
    />

    <!-- Image selector modal -->
    <image-selector-modal ref="imageSelectorRef" @select="handleImageSelect" />

    <!-- Image preview modal (using antd Image.PreviewGroup) -->
    <div style="display: none">
      <a-image
        :preview="{
          visible: previewVisible,
          onVisibleChange: handlePreviewVisibleChange
        }"
        :src="modelValue"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  UploadOutlined,
  FolderOpenOutlined,
  PictureOutlined,
  CloseCircleFilled,
  EyeOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { DirectoryItem } from '@/services/images'
import UploadModal from '@/components/image/UploadModal.vue'
import ImageSelectorModal from '@/components/image/ImageSelectorModal.vue'

interface Props {
  modelValue?: string // Current image URL
  allowStorageSwitch?: boolean // Allow switching between local and qiniu
  storageType?: 'local' | 'qiniu' // Default storage type
  uploadPath?: string // Upload directory path
  width?: string // Preview container width
  height?: string // Preview container height
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  allowStorageSwitch: true,
  storageType: 'local',
  uploadPath: '',
  width: '104px',
  height: '104px'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const hovering = ref(false)
const showActions = ref(false)
const uploadModalRef = ref()
const imageSelectorRef = ref()
const previewVisible = ref(false)

// Handle upload button click
const handleUploadClick = () => {
  uploadModalRef.value?.show()
}

// Handle select button click
const handleSelectClick = () => {
  imageSelectorRef.value?.show()
}

// Handle clear button click
const handleClear = () => {
  emit('update:modelValue', '')
}

// Handle preview button click
const handlePreview = () => {
  previewVisible.value = true
}

// Handle preview modal visibility change
const handlePreviewVisibleChange = (visible: boolean) => {
  previewVisible.value = visible
}

// Handle upload success
const handleUploadSuccess = (uploadedFiles: DirectoryItem[]) => {
  if (uploadedFiles && uploadedFiles.length > 0) {
    emit('update:modelValue', uploadedFiles[0].path)
    message.success('图片上传成功')
  }
}

// Handle image select from existing images
const handleImageSelect = (imageUrl: string) => {
  emit('update:modelValue', imageUrl)
  message.success('图片选择成功')
}
</script>

<style scoped>
.image-uploader {
  display: inline-block;
  position: relative;
}

.image-preview-container {
  width: v-bind(width);
  height: v-bind(height);
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.3s;
}

.image-uploader:hover .image-preview-container {
  border-color: #40a9ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.placeholder-text {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

/* Hover overlay with action buttons */
.action-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.image-uploader:hover .action-overlay {
  opacity: 1;
  pointer-events: auto;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: #fff;
  transform: scale(1.1);
}

.action-icon {
  font-size: 18px;
  color: #1890ff;
}

/* Image actions overlay when image exists */
.image-actions-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.image-uploader:hover .image-actions-overlay {
  opacity: 1;
  pointer-events: auto;
}

/* Preview button (center) */
.preview-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.preview-btn:hover {
  background: #fff;
  transform: scale(1.15);
}

.preview-icon {
  font-size: 24px;
  color: #1890ff;
}

/* Clear button (top-right corner) */
.clear-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  z-index: 10;
}

.clear-btn:hover {
  background: #fff;
  transform: scale(1.1);
}

.clear-icon {
  font-size: 18px;
  color: #ff4d4f;
}
</style>
