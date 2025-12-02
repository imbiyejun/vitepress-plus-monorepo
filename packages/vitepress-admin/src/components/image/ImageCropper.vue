<template>
  <div class="image-cropper">
    <Cropper
      class="cropper"
      :src="previewUrl"
      :stencil-props="{
        aspectRatio: null
      }"
      @change="onChange"
      @ready="onImageLoaded"
      ref="cropperRef"
    />
    <div class="cropper-actions">
      <a-space>
        <template v-if="!previewMode">
          <a-button type="primary" ghost @click="rotate(-90)">
            <template #icon><rotate-left-outlined /></template>
            向左旋转
          </a-button>
          <a-button type="primary" ghost @click="rotate(90)">
            <template #icon><rotate-right-outlined /></template>
            向右旋转
          </a-button>
          <a-button type="primary" @click="crop">
            <template #icon><check-outlined /></template>
            确认裁剪
          </a-button>
        </template>
        <template v-else>
          <a-button type="primary" ghost @click="restoreOriginal">
            <template #icon><undo-outlined /></template>
            恢复原图
          </a-button>
          <a-button type="primary" ghost @click="goWatermark">
            <template #icon><picture-outlined /></template>
            添加水印
          </a-button>
          <a-button type="primary" ghost @click="goCompress">
            <template #icon><compress-outlined /></template>
            去压缩
          </a-button>
          <a-button type="primary" @click="continueCrop">
            <template #icon><check-outlined /></template>
            继续裁剪
          </a-button>
        </template>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

// 创建 Worker 实例
let worker: Worker | null = null

// 初始化 Worker
const initWorker = () => {
  worker = new Worker(new URL('../../workers/image-worker.ts', import.meta.url), {
    type: 'module'
  })

  worker.addEventListener('message', e => {
    const { type, size } = e.data
    if (type === 'size-calculated') {
      emit('crop-change', size)
    }
  })
}

// 销毁 Worker
const destroyWorker = () => {
  if (worker) {
    worker.terminate()
    worker = null
  }
}
import {
  RotateLeftOutlined,
  RotateRightOutlined,
  CheckOutlined,
  UndoOutlined,
  CompressOutlined,
  PictureOutlined
} from '@ant-design/icons-vue'

const props = defineProps<{
  imageUrl: string
  originalImageUrl?: string // 原始图片URL，如果不提供则使用imageUrl
  outputType?: string
  quality?: number // 图片质量，范围 0-1，默认 0.8
}>()

const emit = defineEmits(['cropped', 'crop-change', 'reset', 'compress', 'watermark'])
const cropperRef = ref()

// 在组件挂载时初始化 Worker
onMounted(() => {
  initWorker()
})

// 在组件卸载时销毁 Worker
onUnmounted(() => {
  destroyWorker()
})
const previewMode = ref(false)
const previewUrl = ref(props.imageUrl)
const croppedData = ref('')
const originalImage = ref(props.originalImageUrl || props.imageUrl)

interface CropData {
  coordinates?: {
    width: number
    height: number
    left: number
    top: number
  }
}

const coordinates = ref<CropData | null>(null)

const onChange = (data: CropData) => {
  coordinates.value = data
}

// 恢复到原始图片
const restoreOriginal = () => {
  previewMode.value = false
  previewUrl.value = originalImage.value
  croppedData.value = ''
  emit('reset') // 发送重置事件
  initCropBox()
}

// 继续裁剪当前图片
const continueCrop = () => {
  previewMode.value = false
}

// 去压缩
const goCompress = () => {
  emit('compress', croppedData.value)
}

// 去添加水印
const goWatermark = () => {
  emit('watermark', croppedData.value)
}

// 初始化剪裁框大小
const initCropBox = () => {
  const cropper = cropperRef.value
  if (!cropper) return

  // 获取图片元素
  const image = cropper.$refs.image
  if (!image) return

  // 获取图片的实际尺寸
  const imageWidth = image.naturalWidth
  const imageHeight = image.naturalHeight

  // 使用 requestAnimationFrame 优化性能
  requestAnimationFrame(() => {
    // 计算合适的初始裁剪框大小
    cropper.setCoordinates({
      width: imageWidth,
      height: imageHeight,
      left: 0,
      top: 0
    })
  })
}

// 监听图片加载完成
const onImageLoaded = () => {
  // 使用 requestAnimationFrame 代替 setTimeout
  requestAnimationFrame(initCropBox)
}

// 旋转图片
const rotate = (angle: number) => {
  cropperRef.value?.rotate(angle)
}

// 获取裁剪数据并预览
const crop = async () => {
  try {
    const canvas = await cropperRef.value?.getCanvas()
    if (!canvas) {
      console.warn('获取画布失败')
      return
    }

    // 获取预览图片，使用0.8的质量压缩比
    const previewData = canvas.toDataURL(
      props.outputType ? `image/${props.outputType}` : 'image/jpeg',
      props.quality ?? 0.8
    )

    // 保存裁剪数据
    croppedData.value = previewData

    // 计算裁剪后的图片大小
    if (worker) {
      worker.postMessage({ type: 'calculate-size', data: previewData })
    }

    // 更新预览图片并进入预览模式
    previewUrl.value = previewData
    previewMode.value = true

    // 延迟一帧后初始化裁剪框
    setTimeout(() => {
      initCropBox()
    }, 50)
  } catch (error) {
    console.error('获取裁剪数据失败:', error)
  }
}

// 获取最终的裁剪数据
const getCropData = () => {
  return croppedData.value
}

// 获取当前裁剪区域的图片数据
const getCurrentCropData = async () => {
  try {
    const canvas = await cropperRef.value?.getCanvas()
    if (!canvas) {
      console.warn('获取画布失败')
      return null
    }

    return canvas.toDataURL(
      props.outputType ? `image/${props.outputType}` : 'image/jpeg',
      props.quality ?? 0.8
    )
  } catch (error) {
    console.error('获取裁剪数据失败:', error)
    return null
  }
}

// 设置预览模式（用于从其他步骤返回时恢复状态）
const setPreviewMode = (imageData: string) => {
  if (imageData) {
    previewMode.value = true
    previewUrl.value = imageData
    croppedData.value = imageData
    // 注意：不要修改 originalImage，它应该始终保持对最初原始图片的引用
    // 延迟一帧后初始化裁剪框
    setTimeout(() => {
      initCropBox()
    }, 50)
  }
}

defineExpose({
  rotate,
  crop,
  restoreOriginal,
  continueCrop,
  getCropData,
  getCurrentCropData,
  setPreviewMode
})
</script>

<style>
.image-cropper {
  width: 100%;
  height: 100%;
  min-height: 500px;
  display: flex;
  flex-direction: column;
}

.cropper {
  flex: 1;
  background: #f5f5f5;
  height: calc(100vh - 300px);
  min-height: 400px;
}

:deep(.vue-advanced-cropper__background) {
  background: #f5f5f5;
}

:deep(.vue-advanced-cropper__stretcher) {
  max-height: none !important;
}

:deep(.vue-advanced-cropper__image) {
  max-height: none !important;
}

.cropper-actions {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

/* Cropper.js 必要的样式 */
.cropper-wrap-box,
.cropper-canvas,
.cropper-drag-box,
.cropper-crop-box,
.cropper-modal {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.cropper-wrap-box {
  overflow: hidden;
}

.cropper-drag-box {
  background-color: #fff;
  opacity: 0;
}

.cropper-modal {
  background-color: #000;
  opacity: 0.5;
}

.cropper-view-box {
  display: block;
  overflow: hidden;
  width: 100%;
  height: 100%;
  outline: 1px solid #39f;
  outline-color: rgba(51, 153, 255, 0.75);
}

.cropper-dashed {
  position: absolute;
  display: block;
  border: 0 dashed #eee;
  opacity: 0.5;
}

.cropper-dashed.dashed-h {
  top: 33.33333%;
  left: 0;
  width: 100%;
  height: 33.33333%;
  border-top-width: 1px;
  border-bottom-width: 1px;
}

.cropper-dashed.dashed-v {
  top: 0;
  left: 33.33333%;
  width: 33.33333%;
  height: 100%;
  border-right-width: 1px;
  border-left-width: 1px;
}

.cropper-center {
  position: absolute;
  top: 50%;
  left: 50%;
  display: block;
  width: 0;
  height: 0;
  opacity: 0.75;
}

.cropper-center::before,
.cropper-center::after {
  position: absolute;
  display: block;
  background-color: #eee;
  content: ' ';
}

.cropper-center::before {
  top: 0;
  left: -3px;
  width: 7px;
  height: 1px;
}

.cropper-center::after {
  top: -3px;
  left: 0;
  width: 1px;
  height: 7px;
}

.cropper-face,
.cropper-line,
.cropper-point {
  position: absolute;
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0.1;
}

.cropper-face {
  top: 0;
  left: 0;
  background-color: #fff;
}

.cropper-line {
  background-color: #39f;
}

.cropper-line.line-e {
  top: 0;
  right: -3px;
  width: 5px;
  cursor: e-resize;
}

.cropper-line.line-n {
  top: -3px;
  left: 0;
  height: 5px;
  cursor: n-resize;
}

.cropper-line.line-w {
  top: 0;
  left: -3px;
  width: 5px;
  cursor: w-resize;
}

.cropper-line.line-s {
  bottom: -3px;
  left: 0;
  height: 5px;
  cursor: s-resize;
}

.cropper-point {
  width: 5px;
  height: 5px;
  background-color: #39f;
  opacity: 0.75;
}

.cropper-point.point-e {
  top: 50%;
  right: -3px;
  margin-top: -3px;
  cursor: e-resize;
}

.cropper-point.point-n {
  top: -3px;
  left: 50%;
  margin-left: -3px;
  cursor: n-resize;
}

.cropper-point.point-w {
  top: 50%;
  left: -3px;
  margin-top: -3px;
  cursor: w-resize;
}

.cropper-point.point-s {
  bottom: -3px;
  left: 50%;
  margin-left: -3px;
  cursor: s-resize;
}

.cropper-point.point-ne {
  top: -3px;
  right: -3px;
  cursor: ne-resize;
}

.cropper-point.point-nw {
  top: -3px;
  left: -3px;
  cursor: nw-resize;
}

.cropper-point.point-sw {
  bottom: -3px;
  left: -3px;
  cursor: sw-resize;
}

.cropper-point.point-se {
  right: -3px;
  bottom: -3px;
  width: 20px;
  height: 20px;
  cursor: se-resize;
  opacity: 0.1;
}

.cropper-point.point-se::before {
  position: absolute;
  right: -50%;
  bottom: -50%;
  display: block;
  width: 200%;
  height: 200%;
  background-color: #39f;
  opacity: 0;
  content: ' ';
}

.cropper-invisible {
  opacity: 0;
}

.cropper-bg {
  background-image:
    linear-gradient(45deg, #f3f3f3 25%, transparent 25%),
    linear-gradient(-45deg, #f3f3f3 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f3f3f3 75%),
    linear-gradient(-45deg, transparent 75%, #f3f3f3 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;
}

.cropper-hide {
  position: absolute;
  display: block;
  width: 0;
  height: 0;
}

.cropper-hidden {
  display: none !important;
}

.cropper-move {
  cursor: move;
}

.cropper-crop {
  cursor: crosshair;
}

.cropper-disabled .cropper-drag-box,
.cropper-disabled .cropper-face,
.cropper-disabled .cropper-line,
.cropper-disabled .cropper-point {
  cursor: not-allowed;
}
</style>
