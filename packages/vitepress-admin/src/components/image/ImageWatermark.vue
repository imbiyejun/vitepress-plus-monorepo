<template>
  <div class="image-watermark">
    <!-- 顶部信息区 -->
    <div class="watermark-info">
      <div class="size-info">
        <span>原始大小: {{ formatFileSize(props.originalSize) }}</span>
        <span>水印后大小: {{ formatFileSize(currentSize) }}</span>
      </div>
    </div>

    <!-- 中间内容区：左右分栏 -->
    <div class="watermark-content">
      <!-- 左侧配置区 -->
      <div class="watermark-controls">
        <div class="control-group">
          <label class="control-label">水印文字:</label>
          <a-input
            v-model:value="watermarkText"
            placeholder="输入水印文字"
            @blur="handleTextChange"
            @pressEnter="handleTextChange"
          />
        </div>
        <div class="control-group">
          <label class="control-label">字体大小:</label>
          <div class="slider-container">
            <a-slider
              v-model:value="fontSize"
              :min="dynamicFontRange.min"
              :max="dynamicFontRange.max"
              :step="dynamicFontRange.step"
              @afterChange="handleFontSizeChange"
              style="flex: 1"
            />
            <span class="value-display">{{ fontSize }}px</span>
          </div>
          <div class="range-hint">
            <span class="hint-text"
              >建议范围: {{ dynamicFontRange.min }}px - {{ dynamicFontRange.max }}px</span
            >
            <a-button
              size="small"
              type="link"
              @click="resetToRecommendedSize"
              style="padding: 0; height: auto; margin-left: 8px"
            >
              推荐大小
            </a-button>
          </div>
        </div>
        <div class="control-group">
          <label class="control-label">透明度:</label>
          <div class="slider-container">
            <a-slider
              v-model:value="opacity"
              :min="0"
              :max="100"
              :step="5"
              @afterChange="handleOpacityChange"
              style="flex: 1"
            />
            <span class="value-display">{{ opacity }}%</span>
          </div>
        </div>
        <div class="control-group">
          <label class="control-label">水印位置:</label>
          <a-select v-model:value="position" @change="handlePositionChange" style="width: 100%">
            <a-select-option value="top-left">左上角</a-select-option>
            <a-select-option value="top-right">右上角</a-select-option>
            <a-select-option value="bottom-left">左下角</a-select-option>
            <a-select-option value="bottom-right">右下角</a-select-option>
            <a-select-option value="center">居中</a-select-option>
            <a-select-option value="repeat">平铺</a-select-option>
          </a-select>
        </div>
        <div class="control-group">
          <label class="control-label">水印颜色:</label>
          <div class="color-container">
            <input
              type="color"
              v-model="watermarkColor"
              @change="handleColorChange"
              class="color-picker"
            />
            <a-input
              v-model:value="hexColor"
              placeholder="ffffff"
              @change="handleHexColorChange"
              @pressEnter="handleHexColorChange"
              style="width: 100px; margin-left: 8px"
            >
              <template #prefix>#</template>
            </a-input>
          </div>
          <div class="color-actions">
            <a-button
              size="small"
              type="primary"
              ghost
              @click="setSmartWatermarkColor"
              style="margin-right: 8px"
            >
              智能颜色
            </a-button>
            <div class="preset-colors">
              <div
                v-for="color in presetColors"
                :key="color"
                class="preset-color"
                :style="{ backgroundColor: color }"
                :class="{ active: watermarkColor === color }"
                @click="setPresetColor(color)"
                :title="color"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧预览区 -->
      <div class="watermark-preview">
        <div class="preview-container">
          <canvas ref="canvasRef" class="watermark-canvas" style="display: none"></canvas>
          <a-image
            v-if="previewImageUrl"
            :src="previewImageUrl"
            alt="水印预览"
            :preview-mask-hover="true"
            class="watermark-preview-image"
          />
        </div>
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <div class="watermark-actions">
      <a-button type="primary" @click="handleConfirm">确认添加水印</a-button>
      <a-button type="primary" ghost @click="handleGoCompress">去压缩</a-button>
      <a-button @click="handleCancel">取消</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { message, Image as AImage } from 'ant-design-vue'

const props = defineProps<{
  imageUrl: string
  originalSize: number
}>()

const emit = defineEmits(['confirm', 'cancel', 'compress'])

const canvasRef = ref<HTMLCanvasElement>()
const currentSize = ref(0)
const originalImage = ref<HTMLImageElement>()
const originalImageFormat = ref('jpeg') // 保存原图格式
const dynamicFontRange = ref({ min: 12, max: 100, default: 24, step: 2 }) // 动态字体范围
const previewImageUrl = ref('') // 用于预览的水印图片URL

// 水印配置的默认值
// 默认水印配置（只保存用户偏好的透明度和位置）
const DEFAULT_WATERMARK_CONFIG = {
  opacity: 30,
  position: 'bottom-right' as const
}

// 从localStorage加载配置或使用默认值（只加载透明度和位置）
const loadWatermarkConfig = () => {
  try {
    const saved = localStorage.getItem('watermark-config')
    return saved ? { ...DEFAULT_WATERMARK_CONFIG, ...JSON.parse(saved) } : DEFAULT_WATERMARK_CONFIG
  } catch {
    return DEFAULT_WATERMARK_CONFIG
  }
}

// 保存配置到localStorage（只保存透明度和位置）
const saveWatermarkConfig = () => {
  try {
    const config = {
      opacity: opacity.value,
      position: position.value
      // 注意：不保存 text, fontSize, color，每次都使用推荐值
    }
    localStorage.setItem('watermark-config', JSON.stringify(config))
  } catch (error) {
    console.warn('保存水印配置失败:', error)
  }
}

// 初始化配置
const config = loadWatermarkConfig()
const watermarkText = ref('© 水印文字') // 默认文字
const fontSize = ref(24) // 默认字体大小，会在初始化时被推荐值替换
const opacity = ref(config.opacity)
const position = ref<
  'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'repeat'
>(config.position)
const watermarkColor = ref('#ffffff') // 默认颜色，会在初始化时被智能颜色替换
const hexColor = ref('ffffff')

// 预设颜色
const presetColors = [
  '#ffffff', // 白色
  '#000000', // 黑色
  '#333333', // 深灰
  '#666666', // 中灰
  '#cccccc', // 浅灰
  '#f0f0f0', // 很浅灰
  '#ff0000', // 红色
  '#00ff00', // 绿色
  '#0000ff', // 蓝色
  '#ffff00', // 黄色
  '#ff00ff', // 紫色
  '#00ffff' // 青色
]

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

// 检测图片格式并获取最佳输出参数
const getOptimalOutputParams = () => {
  // 从原始URL检测格式
  if (props.imageUrl.includes('data:image/')) {
    const mimeMatch = props.imageUrl.match(/data:image\/([^;]+)/)
    if (mimeMatch) {
      const format = mimeMatch[1].toLowerCase()
      originalImageFormat.value = format

      // 根据格式选择最佳参数
      switch (format) {
        case 'png':
          return { mimeType: 'image/png', quality: undefined } // PNG不需要质量参数
        case 'webp':
          return { mimeType: 'image/webp', quality: 0.98 } // WebP使用更高质量
        case 'gif':
          return { mimeType: 'image/png', quality: undefined } // GIF转为PNG保持无损
        default:
          return { mimeType: 'image/jpeg', quality: 0.98 } // JPEG使用更高质量
      }
    }
  }

  // 从文件扩展名检测（如果是文件路径）
  const urlPath = props.imageUrl.toLowerCase()
  if (urlPath.includes('.png')) {
    originalImageFormat.value = 'png'
    return { mimeType: 'image/png', quality: undefined }
  } else if (urlPath.includes('.webp')) {
    originalImageFormat.value = 'webp'
    return { mimeType: 'image/webp', quality: 0.98 }
  } else if (urlPath.includes('.gif')) {
    originalImageFormat.value = 'gif'
    return { mimeType: 'image/png', quality: undefined } // GIF转PNG
  }

  // 默认使用高质量JPEG
  originalImageFormat.value = 'jpeg'
  return { mimeType: 'image/jpeg', quality: 0.98 }
}

// 生成高质量的图片数据
const generateHighQualityImage = (canvas: HTMLCanvasElement): string => {
  const { mimeType, quality } = getOptimalOutputParams()

  if (quality !== undefined) {
    return canvas.toDataURL(mimeType, quality)
  } else {
    return canvas.toDataURL(mimeType)
  }
}

// 根据图片尺寸计算合适的字体大小范围
const calculateDynamicFontRange = (imageWidth: number, imageHeight: number) => {
  // 计算图片的平均尺寸作为基准
  const avgDimension = (imageWidth + imageHeight) / 2

  // 基于图片尺寸计算字体大小比例
  // 小图片(平均尺寸<500): 较小字体
  // 中等图片(500-1500): 标准字体
  // 大图片(>1500): 较大字体
  let baseSize, minSize, maxSize

  if (avgDimension < 500) {
    // 小图片
    baseSize = Math.max(12, Math.round(avgDimension * 0.04))
    minSize = Math.max(8, Math.round(avgDimension * 0.02))
    maxSize = Math.max(24, Math.round(avgDimension * 0.08))
  } else if (avgDimension < 1500) {
    // 中等图片
    baseSize = Math.max(16, Math.round(avgDimension * 0.03))
    minSize = Math.max(12, Math.round(avgDimension * 0.015))
    maxSize = Math.max(48, Math.round(avgDimension * 0.06))
  } else {
    // 大图片
    baseSize = Math.max(24, Math.round(avgDimension * 0.025))
    minSize = Math.max(16, Math.round(avgDimension * 0.01))
    maxSize = Math.max(72, Math.round(avgDimension * 0.05))
  }

  // 确保最大值不超过合理范围
  maxSize = Math.min(maxSize, 120)

  // 根据字体大小范围计算合适的步长
  const range = maxSize - minSize
  let step = 2
  if (range > 80) {
    step = 4 // 大范围使用较大步长
  } else if (range > 40) {
    step = 3 // 中等范围使用中等步长
  } else {
    step = 2 // 小范围使用小步长
  }

  return { min: minSize, max: maxSize, default: baseSize, step }
}

// 更新动态字体范围并调整当前字体大小
const updateDynamicFontRange = (imageWidth: number, imageHeight: number) => {
  const newRange = calculateDynamicFontRange(imageWidth, imageHeight)
  dynamicFontRange.value = newRange

  // 如果当前字体大小超出新范围，则调整到合适值
  if (fontSize.value < newRange.min) {
    fontSize.value = newRange.min
  } else if (fontSize.value > newRange.max) {
    fontSize.value = newRange.max
  } else if (fontSize.value === 24) {
    // 如果当前是默认值，则使用新的默认值
    fontSize.value = newRange.default
  }
}

// 加载图片
const loadImage = (): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.crossOrigin = 'anonymous'
    img.src = props.imageUrl
  })
}

// 计算响应式边距
const calculateResponsiveMargin = (imgWidth: number, imgHeight: number): number => {
  // 基于图片尺寸计算合适的边距
  const avgDimension = (imgWidth + imgHeight) / 2
  let margin = 20 // 默认边距

  if (avgDimension < 500) {
    // 小图片使用较小边距
    margin = Math.max(10, Math.round(avgDimension * 0.02))
  } else if (avgDimension < 1500) {
    // 中等图片使用标准边距
    margin = Math.max(15, Math.round(avgDimension * 0.015))
  } else {
    // 大图片使用较大边距
    margin = Math.max(25, Math.round(avgDimension * 0.018))
  }

  return Math.min(margin, 50) // 限制最大边距
}

// 计算动态水印位置
const calculateWatermarkPosition = (
  canvas: HTMLCanvasElement,
  textWidth: number,
  textHeight: number,
  position: string
): { x: number; y: number } => {
  const margin = calculateResponsiveMargin(canvas.width, canvas.height)
  let x = 0,
    y = 0

  switch (position) {
    case 'top-left':
      x = margin
      y = margin + textHeight
      break
    case 'top-right':
      x = canvas.width - textWidth - margin
      y = margin + textHeight
      break
    case 'bottom-left':
      x = margin
      y = canvas.height - margin - textHeight * 0.2 // 调整基线位置
      break
    case 'bottom-right':
      x = canvas.width - textWidth - margin
      y = canvas.height - margin - textHeight * 0.2
      break
    case 'center':
      x = (canvas.width - textWidth) / 2
      y = (canvas.height + textHeight) / 2
      break
  }

  return { x, y }
}

// 计算平铺模式的网格参数
const calculateTileGrid = (
  canvas: HTMLCanvasElement,
  textWidth: number,
  textHeight: number
): { spacingX: number; spacingY: number; offsetX: number; offsetY: number } => {
  // 基于图片尺寸和文字大小计算间距
  const imgArea = canvas.width * canvas.height

  // 动态计算间距，确保适当的密度
  let spacingX: number, spacingY: number

  if (imgArea < 500 * 500) {
    // 小图片：较密集的平铺
    spacingX = Math.max(textWidth * 1.5, 100)
    spacingY = Math.max(textHeight * 2.5, 50)
  } else if (imgArea < 1500 * 1500) {
    // 中等图片：标准密度
    spacingX = Math.max(textWidth * 2, 150)
    spacingY = Math.max(textHeight * 3, 80)
  } else {
    // 大图片：较稀疏的平铺
    spacingX = Math.max(textWidth * 2.5, 200)
    spacingY = Math.max(textHeight * 3.5, 100)
  }

  // 计算偏移量，确保水印均匀分布
  const offsetX = spacingX * 0.3
  const offsetY = spacingY * 0.2

  return { spacingX, spacingY, offsetX, offsetY }
}

// 绘制平铺水印
const drawTiledWatermark = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  textWidth: number,
  textHeight: number
) => {
  const { spacingX, spacingY, offsetX, offsetY } = calculateTileGrid(canvas, textWidth, textHeight)

  // 轻微旋转角度，增加水印效果
  const angle = -12 * (Math.PI / 180)

  ctx.save()
  ctx.rotate(angle)

  // 计算旋转后需要的渲染范围
  const diagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height)
  const renderSize = diagonal * 1.5

  // 计算起始位置，确保覆盖整个可见区域
  const startX = -renderSize / 2
  const startY = -renderSize / 2

  // 绘制网格化的水印
  for (let i = startX; i < renderSize; i += spacingX) {
    for (let j = startY; j < renderSize; j += spacingY) {
      // 交错排列，增加视觉效果
      const staggeredX = i + (Math.floor(j / spacingY) % 2) * offsetX
      const staggeredY = j + offsetY

      // 计算旋转后在原始坐标系中的位置
      const rotatedX = staggeredX * Math.cos(-angle) - staggeredY * Math.sin(-angle)
      const rotatedY = staggeredX * Math.sin(-angle) + staggeredY * Math.cos(-angle)

      // 只绘制在可见区域内的水印
      if (
        rotatedX > -textWidth * 2 &&
        rotatedX < canvas.width + textWidth &&
        rotatedY > -textHeight &&
        rotatedY < canvas.height + textHeight * 2
      ) {
        ctx.fillText(text, staggeredX, staggeredY + textHeight)
      }
    }
  }

  ctx.restore()
}

// 绘制水印
const drawWatermark = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement
) => {
  // 清空画布并绘制原图
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  if (!watermarkText.value.trim()) return

  // 设置水印样式
  ctx.font = `${fontSize.value}px Arial`
  ctx.fillStyle = watermarkColor.value
  ctx.globalAlpha = opacity.value / 100

  // 添加文字阴影以提高可见性
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  ctx.shadowBlur = 4

  const text = watermarkText.value
  const textMetrics = ctx.measureText(text)
  const textWidth = textMetrics.width
  const textHeight = fontSize.value

  if (position.value === 'repeat') {
    // 平铺模式
    drawTiledWatermark(ctx, canvas, text, textWidth, textHeight)
  } else {
    // 单个位置模式
    const { x, y } = calculateWatermarkPosition(canvas, textWidth, textHeight, position.value)
    ctx.fillText(text, x, y)
  }

  // 清除阴影设置并恢复透明度
  ctx.shadowColor = 'transparent'
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}

// 计算当前图片大小
const calculateCurrentSize = () => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const dataUrl = generateHighQualityImage(canvas)
  const base64Data = dataUrl.split(',')[1]
  currentSize.value = atob(base64Data).length
}

// 更新预览
const updatePreview = async () => {
  if (!canvasRef.value || !originalImage.value) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  drawWatermark(ctx, canvas, originalImage.value)
  calculateCurrentSize()

  // 更新预览图片URL
  previewImageUrl.value = generateHighQualityImage(canvas)

  saveWatermarkConfig()
}

// 带消息提示的更新预览
const updatePreviewWithMessage = async () => {
  if (!canvasRef.value || !originalImage.value) {
    message.warning('请等待图片加载完成')
    return
  }

  try {
    message.loading({ content: '正在生成水印预览...', key: 'watermark' })

    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      message.error({ content: '画布初始化失败', key: 'watermark' })
      return
    }

    drawWatermark(ctx, canvas, originalImage.value)
    calculateCurrentSize()

    // 更新预览图片URL
    previewImageUrl.value = generateHighQualityImage(canvas)

    saveWatermarkConfig()

    message.success({ content: '水印预览已更新', key: 'watermark', duration: 1 })
  } catch (error) {
    console.error('更新水印预览失败:', error)
    message.error({ content: '更新水印预览失败', key: 'watermark' })
  }
}

// 检查是否需要自动调整颜色
const checkAutoColorAdjust = () => {
  // 只有在用户使用默认颜色时才自动调整
  const isDefaultColor = ['#ffffff', '#000000', '#333333'].includes(watermarkColor.value)
  if (isDefaultColor) {
    const smartColor = getSmartWatermarkColor()
    if (smartColor !== watermarkColor.value) {
      watermarkColor.value = smartColor
      hexColor.value = smartColor.replace('#', '')
    }
  }
}

// 处理字体大小变化
const handleFontSizeChange = async () => {
  await updatePreviewWithMessage()
}

// 处理透明度变化
const handleOpacityChange = async () => {
  await updatePreviewWithMessage()
}

// 处理文字变化
const handleTextChange = async () => {
  if (!watermarkText.value.trim()) {
    message.warning('请输入水印文字')
    return
  }
  checkAutoColorAdjust()
  await updatePreviewWithMessage()
}

// 处理位置变化
const handlePositionChange = async () => {
  checkAutoColorAdjust()
  await updatePreviewWithMessage()
}

// 处理颜色变化
const handleColorChange = async () => {
  hexColor.value = watermarkColor.value.replace('#', '')
  await updatePreviewWithMessage()
}

// 处理十六进制颜色输入
const handleHexColorChange = async () => {
  let hex = hexColor.value
  // 移除 # 号（如果有的话）
  hex = hex.replace('#', '')

  // 验证十六进制颜色格式
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
    watermarkColor.value = `#${hex}`
    await updatePreviewWithMessage()
  } else if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
    // 处理简短格式（如 fff -> ffffff）
    const expandedHex = hex
      .split('')
      .map(char => char + char)
      .join('')
    watermarkColor.value = `#${expandedHex}`
    hexColor.value = expandedHex
    await updatePreviewWithMessage()
  } else {
    // 恢复为当前有效的颜色值
    hexColor.value = watermarkColor.value.replace('#', '')
    message.warning('请输入有效的十六进制颜色值')
  }
}

// 重置为推荐字体大小
const resetToRecommendedSize = async () => {
  fontSize.value = dynamicFontRange.value.default
  await updatePreviewWithMessage()
}

// 应用推荐设置（仅字体大小和颜色，保留透明度和位置）
const applyRecommendedSettings = () => {
  // 应用推荐字体大小
  fontSize.value = dynamicFontRange.value.default

  // 应用智能颜色
  const smartColor = getSmartWatermarkColor()
  watermarkColor.value = smartColor
  hexColor.value = smartColor.replace('#', '')

  // 注意：不修改 opacity.value 和 position.value，保留用户设置
  // 保存当前透明度和位置设置
  saveWatermarkConfig()
}

// 分析图片指定区域的平均颜色
const analyzeRegionColor = (
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number
): { r: number; g: number; b: number; brightness: number } => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { r: 128, g: 128, b: 128, brightness: 128 }

  // 确保取样区域在画布范围内
  const sampleX = Math.max(0, Math.min(x, canvas.width - 1))
  const sampleY = Math.max(0, Math.min(y, canvas.height - 1))
  const sampleWidth = Math.min(width, canvas.width - sampleX)
  const sampleHeight = Math.min(height, canvas.height - sampleY)

  try {
    const imageData = ctx.getImageData(sampleX, sampleY, sampleWidth, sampleHeight)
    const data = imageData.data
    let totalR = 0,
      totalG = 0,
      totalB = 0,
      pixelCount = 0

    // 采样像素（每隔几个像素取样以提高性能）
    const step = Math.max(1, Math.floor(Math.sqrt(sampleWidth * sampleHeight) / 20))

    for (let i = 0; i < data.length; i += 4 * step) {
      totalR += data[i]
      totalG += data[i + 1]
      totalB += data[i + 2]
      pixelCount++
    }

    const avgR = Math.round(totalR / pixelCount)
    const avgG = Math.round(totalG / pixelCount)
    const avgB = Math.round(totalB / pixelCount)

    // 计算亮度 (使用感知亮度公式)
    const brightness = Math.round(0.299 * avgR + 0.587 * avgG + 0.114 * avgB)

    return { r: avgR, g: avgG, b: avgB, brightness }
  } catch (error) {
    console.warn('颜色分析失败:', error)
    return { r: 128, g: 128, b: 128, brightness: 128 }
  }
}

// 根据背景亮度选择最佳文字颜色
const getBestTextColor = (backgroundColor: {
  r: number
  g: number
  b: number
  brightness: number
}): string => {
  const { brightness } = backgroundColor

  // 根据背景亮度选择对比色
  if (brightness > 128) {
    // 亮背景使用深色文字
    if (brightness > 200) {
      return '#000000' // 很亮的背景用纯黑
    } else {
      return '#333333' // 中等亮度用深灰
    }
  } else {
    // 暗背景使用浅色文字
    if (brightness < 50) {
      return '#ffffff' // 很暗的背景用纯白
    } else {
      return '#f0f0f0' // 中等暗度用浅灰
    }
  }
}

// 获取水印位置的背景颜色并推荐最佳文字颜色
const getSmartWatermarkColor = (): string => {
  if (!canvasRef.value || !originalImage.value) return '#ffffff'

  const canvas = canvasRef.value
  const img = originalImage.value
  const textMetrics = canvas
    .getContext('2d', { willReadFrequently: true })
    ?.measureText(watermarkText.value)
  if (!textMetrics) return '#ffffff'

  const textWidth = textMetrics.width
  const textHeight = fontSize.value

  if (position.value === 'repeat') {
    // 平铺模式采样多个区域取平均
    const margin = calculateResponsiveMargin(canvas.width, canvas.height)
    const samples = [
      analyzeRegionColor(canvas, margin, margin, 100, 50),
      analyzeRegionColor(canvas, img.width - 120, margin, 100, 50),
      analyzeRegionColor(canvas, margin, img.height - 70, 100, 50),
      analyzeRegionColor(canvas, img.width - 120, img.height - 70, 100, 50),
      analyzeRegionColor(canvas, img.width / 2 - 50, img.height / 2 - 25, 100, 50)
    ]

    const avgBrightness =
      samples.reduce((sum, sample) => sum + sample.brightness, 0) / samples.length
    return getBestTextColor({ r: 128, g: 128, b: 128, brightness: avgBrightness })
  } else {
    // 单个位置模式 - 使用与绘制相同的位置计算
    const { x, y } = calculateWatermarkPosition(canvas, textWidth, textHeight, position.value)

    // 采样区域大小
    const sampleWidth = Math.min(textWidth + 40, 150)
    const sampleHeight = Math.max(textHeight + 20, 50)

    // 调整采样位置，确保在文字区域
    let sampleX = x - 20
    let sampleY = y - textHeight - 10

    // 确保采样区域在画布范围内
    sampleX = Math.max(0, Math.min(sampleX, canvas.width - sampleWidth))
    sampleY = Math.max(0, Math.min(sampleY, canvas.height - sampleHeight))

    const backgroundColor = analyzeRegionColor(canvas, sampleX, sampleY, sampleWidth, sampleHeight)
    return getBestTextColor(backgroundColor)
  }
}

// 智能设置水印颜色
const setSmartWatermarkColor = async () => {
  const smartColor = getSmartWatermarkColor()
  watermarkColor.value = smartColor
  hexColor.value = smartColor.replace('#', '')
  await updatePreviewWithMessage()
}

// 设置预设颜色
const setPresetColor = async (color: string) => {
  watermarkColor.value = color
  hexColor.value = color.replace('#', '')
  await updatePreviewWithMessage()
}

// 初始化画布
const initCanvas = async () => {
  try {
    const img = await loadImage()
    originalImage.value = img

    await nextTick()
    if (!canvasRef.value) return

    const canvas = canvasRef.value
    canvas.width = img.width
    canvas.height = img.height

    // 根据图片尺寸更新动态字体范围
    updateDynamicFontRange(img.width, img.height)

    // 应用推荐设置（除了透明度和位置）
    applyRecommendedSettings()

    // 设置画布显示尺寸，保持宽高比，适应右侧预览区域
    const container = canvas.parentElement
    if (container) {
      const containerWidth = container.clientWidth - 40 // 减去padding
      const containerHeight = container.clientHeight - 40
      const scale = Math.min(containerWidth / img.width, containerHeight / img.height, 1)

      let displayWidth = img.width * scale
      let displayHeight = img.height * scale

      // 确保在右侧预览区域有足够的显示尺寸
      const minWidth = Math.min(400, containerWidth * 0.8)
      const minHeight = Math.min(300, containerHeight * 0.8)

      if (displayWidth < minWidth && displayHeight < minHeight) {
        const scaleToMin = Math.min(minWidth / img.width, minHeight / img.height)
        displayWidth = img.width * scaleToMin
        displayHeight = img.height * scaleToMin
      }

      canvas.style.width = `${displayWidth}px`
      canvas.style.height = `${displayHeight}px`
    }

    updatePreview()
  } catch (error) {
    console.error('加载图片失败:', error)
    message.error('加载图片失败')
  }
}

// 确认添加水印
const handleConfirm = () => {
  if (!canvasRef.value) {
    message.error('画布未准备就绪')
    return
  }

  const canvas = canvasRef.value
  const dataUrl = generateHighQualityImage(canvas)
  const base64Data = dataUrl.split(',')[1]
  const size = atob(base64Data).length

  emit('confirm', {
    dataUrl,
    size,
    watermarkText: watermarkText.value,
    settings: {
      fontSize: fontSize.value,
      opacity: opacity.value,
      position: position.value,
      color: watermarkColor.value,
      format: originalImageFormat.value
    }
  })
}

// 取消
const handleCancel = () => {
  emit('cancel')
}

// 去压缩
const handleGoCompress = () => {
  if (!canvasRef.value) {
    message.error('画布未准备就绪')
    return
  }

  const canvas = canvasRef.value
  const dataUrl = generateHighQualityImage(canvas)
  emit('compress', dataUrl)
}

// 监听图片URL变化
watch(
  () => props.imageUrl,
  () => {
    if (props.imageUrl) {
      initCanvas()
    }
  },
  { immediate: true }
)

// 窗口大小变化时重新调整画布
const handleResize = () => {
  if (originalImage.value && canvasRef.value) {
    const canvas = canvasRef.value
    const container = canvas.parentElement
    if (container) {
      const containerWidth = container.clientWidth - 40
      const containerHeight = container.clientHeight - 40
      const scale = Math.min(
        containerWidth / originalImage.value.width,
        containerHeight / originalImage.value.height,
        1
      )

      let displayWidth = originalImage.value.width * scale
      let displayHeight = originalImage.value.height * scale

      // 确保在右侧预览区域有足够的显示尺寸
      const minWidth = Math.min(400, containerWidth * 0.8)
      const minHeight = Math.min(300, containerHeight * 0.8)

      if (displayWidth < minWidth && displayHeight < minHeight) {
        const scaleToMin = Math.min(
          minWidth / originalImage.value.width,
          minHeight / originalImage.value.height
        )
        displayWidth = originalImage.value.width * scaleToMin
        displayHeight = originalImage.value.height * scaleToMin
      }

      canvas.style.width = `${displayWidth}px`
      canvas.style.height = `${displayHeight}px`
    }
  }
}

onMounted(() => {
  initCanvas()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// 暴露方法给父组件
defineExpose({
  handleConfirm
})
</script>

<style scoped>
.image-watermark {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.watermark-info {
  flex-shrink: 0;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 4px;
  margin: 16px 16px 0 16px;
}

.size-info {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666;
}

.size-info span:last-child {
  color: #1890ff;
  font-weight: 500;
}

.watermark-content {
  flex: 1;
  display: flex;
  gap: 16px;
  margin: 16px;
  min-height: 0;
}

.watermark-controls {
  flex: 0 0 320px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
  overflow-y: auto;
  max-height: 100%;
}

.watermark-preview {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
  min-height: 0;
}

.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.watermark-canvas {
  max-width: 100%;
  max-height: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.watermark-preview-image {
  max-width: 100%;
  max-height: 100%;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  :deep(.ant-image) {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  :deep(.ant-image-img) {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 4px;
  }
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.value-display {
  min-width: 50px;
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.range-hint {
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hint-text {
  font-size: 11px;
  color: #999;
  font-style: italic;
}

.color-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-picker {
  width: 40px;
  height: 32px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
}

.color-actions {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-color {
  width: 20px;
  height: 20px;
  border: 2px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.preset-color:hover {
  border-color: #1890ff;
  transform: scale(1.1);
}

.preset-color.active {
  border-color: #1890ff;
  border-width: 3px;
}

.preset-color.active::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #1890ff;
  font-size: 12px;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);
}

.watermark-actions {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}
</style>
