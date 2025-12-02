<template>
  <a-modal
    v-model:open="visible"
    :title="
      currentStep === 0
        ? '上传图片'
        : currentStep === 1
          ? '图片裁剪'
          : currentStep === 2
            ? '添加水印'
            : '图片压缩'
    "
    @ok="handleOk"
    @cancel="handleCancel"
    :confirmLoading="confirmLoading"
    width="1000px"
    :maskClosable="false"
  >
    <div class="upload-container">
      <div v-if="currentStep === 0">
        <!-- Storage type switcher -->
        <div v-if="allowStorageSwitch" class="storage-switcher">
          <a-radio-group v-model:value="currentStorageType" button-style="solid" size="small">
            <a-radio-button value="local">本地上传</a-radio-button>
            <a-radio-button value="qiniu">七牛云上传</a-radio-button>
          </a-radio-group>
        </div>

        <!-- Directory selection -->
        <div class="directory-selection">
          <div class="directory-header">
            <span class="directory-label">上传目录:</span>
            <a-space>
              <a-button size="small" @click="showDirectoryModal">
                <template #icon><folder-outlined /></template>
                选择目录
              </a-button>
              <a-button size="small" @click="showCreateDirModal">
                <template #icon><folder-add-outlined /></template>
                新建目录
              </a-button>
            </a-space>
          </div>
          <div class="directory-path">
            <breadcrumb
              :breadcrumbs="directoryBreadcrumbs"
              :show-search="false"
              @navigate="handleDirectoryNavigate"
            />
          </div>
        </div>

        <a-upload-dragger
          v-model:fileList="fileList"
          :multiple="true"
          :before-upload="beforeUpload"
          @drop="handleDrop"
          @change="handleChange"
          accept="image/jpeg,image/png,image/gif,image/webp"
        >
          <p class="ant-upload-drag-icon">
            <inbox-outlined />
          </p>
          <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p class="ant-upload-hint">支持单个或批量上传，仅支持 jpg、png、gif、webp 格式的图片</p>
        </a-upload-dragger>
      </div>

      <div v-else-if="currentStep === 1" class="crop-step">
        <div class="crop-info">
          <div>
            正在裁剪: {{ fileList[currentImageIndex]?.originFileObj?.name }}
            <span class="crop-progress">({{ currentImageIndex + 1 }}/{{ fileList.length }})</span>
          </div>
          <div class="size-info">
            <span
              >原始大小:
              {{ formatFileSize(fileList[currentImageIndex]?.originFileObj?.size || 0) }}</span
            >
            <span>裁剪大小: {{ currentCropSize }}</span>
          </div>
        </div>
        <image-cropper
          ref="cropperRef"
          :key="currentImageUrl"
          :image-url="currentImageUrl"
          :original-image-url="originalImageUrl"
          :output-type="currentImageType"
          :quality="0.8"
          @cropped="handleCropped"
          @crop-change="handleCropChange"
          @reset="currentCropSize = '0 B'"
          @compress="handleGoCompress"
          @watermark="handleGoWatermark"
        />
      </div>
      <div v-else-if="currentStep === 2" class="watermark-step">
        <image-watermark
          ref="watermarkRef"
          :image-url="currentImageUrl"
          :original-size="currentImageSize"
          @confirm="handleWatermarkConfirm"
          @cancel="handleWatermarkCancel"
          @compress="handleWatermarkGoCompress"
        />
      </div>
      <div v-else-if="currentStep === 3" class="compress-step">
        <image-compressor
          ref="compressorRef"
          :image-url="currentImageUrl"
          :original-size="currentImageSize"
          @confirm="handleCompressConfirm"
          @cancel="handleCompressCancel"
        />
      </div>
    </div>

    <!-- Directory selection modal -->
    <a-modal
      v-model:open="directoryModalVisible"
      title="选择上传目录"
      width="600px"
      @ok="handleDirectoryOk"
      @cancel="handleDirectoryCancel"
    >
      <a-spin :spinning="directoryLoading">
        <div class="directory-modal-content">
          <breadcrumb
            :breadcrumbs="modalBreadcrumbs"
            :show-search="false"
            @navigate="handleModalBreadcrumbNavigate"
          />
          <a-list :data-source="directories" class="directory-list">
            <template #renderItem="{ item }">
              <a-list-item class="directory-list-item" @click="handleDirectoryClick(item.path)">
                <a-list-item-meta>
                  <template #avatar>
                    <folder-outlined style="font-size: 20px; color: #1890ff" />
                  </template>
                  <template #title>
                    {{ item.name }}
                  </template>
                </a-list-item-meta>
                <template #actions>
                  <a-button type="link" size="small" @click.stop="handleDirectoryClick(item.path)">
                    进入
                  </a-button>
                </template>
              </a-list-item>
            </template>
          </a-list>
          <a-empty v-if="directories.length === 0" description="当前目录下没有子目录" />
        </div>
      </a-spin>
    </a-modal>

    <!-- Create directory modal -->
    <create-directory-modal
      ref="createDirModalRef"
      :current-path="selectedUploadPath"
      @success="handleCreateDirSuccess"
    />
  </a-modal>
</template>

<script setup lang="ts">
import { ref, defineEmits, watch } from 'vue'
import { message } from 'ant-design-vue'
import { InboxOutlined, FolderOutlined, FolderAddOutlined } from '@ant-design/icons-vue'
import type { UploadProps } from 'ant-design-vue'
import {
  uploadImages,
  uploadToQiniu,
  getLocalDirectories,
  getQiniuDirectories,
  createDirectory,
  createQiniuDirectory
} from '@/services/images'
import type { Breadcrumb as BreadcrumbType } from '@/services/images'
import ImageCropper from './ImageCropper.vue'
import ImageCompressor from './ImageCompressor.vue'
import ImageWatermark from './ImageWatermark.vue'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import CreateDirectoryModal from './CreateDirectoryModal.vue'

interface Props {
  uploadPath?: string
  storageType?: 'local' | 'qiniu'
  allowStorageSwitch?: boolean // Allow switching between local and qiniu
}

const props = withDefaults(defineProps<Props>(), {
  uploadPath: '',
  storageType: 'local',
  allowStorageSwitch: false
})

const emit = defineEmits(['success', 'cancel'])

// Current storage type (can be switched if allowStorageSwitch is true)
const currentStorageType = ref<'local' | 'qiniu'>(props.storageType)

// Directory selection state
const selectedUploadPath = ref(props.uploadPath || '')
const directoryModalVisible = ref(false)
const directoryLoading = ref(false)
const directories = ref<Array<{ name: string; path: string }>>([])
const modalBreadcrumbs = ref<BreadcrumbType[]>([])
const directoryBreadcrumbs = ref<BreadcrumbType[]>([])
const currentModalPath = ref('')
const createDirModalRef = ref()

// Load directories for selection modal
const loadDirectories = async (prefix: string = '') => {
  directoryLoading.value = true
  try {
    const data =
      currentStorageType.value === 'local'
        ? await getLocalDirectories(prefix)
        : await getQiniuDirectories(prefix)

    directories.value = data.directories
    modalBreadcrumbs.value = data.breadcrumbs
    currentModalPath.value = data.currentPath
  } catch (error) {
    console.error('Failed to load directories:', error)
    message.error('加载目录失败')
  } finally {
    directoryLoading.value = false
  }
}

// Initialize directory breadcrumbs
const initDirectoryBreadcrumbs = () => {
  if (currentStorageType.value === 'local') {
    directoryBreadcrumbs.value = [{ name: 'public', path: '' }]
    if (selectedUploadPath.value) {
      const parts = selectedUploadPath.value.split('/').filter(Boolean)
      let currentPath = ''
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        directoryBreadcrumbs.value.push({ name: part, path: currentPath })
      }
    }
  } else {
    directoryBreadcrumbs.value = [{ name: '根目录', path: '' }]
    if (selectedUploadPath.value) {
      const parts = selectedUploadPath.value.replace(/\/$/, '').split('/').filter(Boolean)
      let currentPath = ''
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}/` : `${part}/`
        directoryBreadcrumbs.value.push({ name: part, path: currentPath })
      }
    }
  }
}

// Watch storage type changes
watch(currentStorageType, () => {
  selectedUploadPath.value = ''
  initDirectoryBreadcrumbs()
})

// Show directory selection modal
const showDirectoryModal = () => {
  directoryModalVisible.value = true
  loadDirectories(selectedUploadPath.value)
}

// Handle directory click in modal
const handleDirectoryClick = (path: string) => {
  loadDirectories(path)
}

// Handle breadcrumb navigation in modal
const handleModalBreadcrumbNavigate = (path: string) => {
  loadDirectories(path)
}

// Handle directory OK button
const handleDirectoryOk = () => {
  selectedUploadPath.value = currentModalPath.value
  initDirectoryBreadcrumbs()
  directoryModalVisible.value = false
}

// Handle directory cancel button
const handleDirectoryCancel = () => {
  directoryModalVisible.value = false
}

// Handle breadcrumb navigation in main view
const handleDirectoryNavigate = (path: string) => {
  selectedUploadPath.value = path
  initDirectoryBreadcrumbs()
}

// Show create directory modal
const showCreateDirModal = () => {
  createDirModalRef.value?.show()
}

// Handle create directory success
const handleCreateDirSuccess = async (directoryName: string) => {
  try {
    if (currentStorageType.value === 'local') {
      await createDirectory(selectedUploadPath.value, directoryName)
    } else {
      await createQiniuDirectory(selectedUploadPath.value, directoryName)
    }
    message.success('目录创建成功')

    // Update selected path to the newly created directory
    const newPath = selectedUploadPath.value
      ? currentStorageType.value === 'local'
        ? `${selectedUploadPath.value}/${directoryName}`
        : `${selectedUploadPath.value}${selectedUploadPath.value.endsWith('/') ? '' : '/'}${directoryName}/`
      : currentStorageType.value === 'local'
        ? directoryName
        : `${directoryName}/`

    selectedUploadPath.value = newPath
    initDirectoryBreadcrumbs()

    // Close create directory modal
    createDirModalRef.value?.handleCancel()

    // Reload directories if modal is open
    if (directoryModalVisible.value) {
      await loadDirectories(selectedUploadPath.value)
    }
  } catch (error: unknown) {
    console.error('Create directory failed:', error)
    let errorMessage = '创建目录失败'
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { data?: { error?: string } } }).response?.data?.error
    ) {
      errorMessage =
        (error as { response?: { data?: { error?: string } } }).response?.data?.error ||
        '创建目录失败'
    }
    message.error(errorMessage)
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

interface FileItem {
  originFileObj: File
  name: string
  status: string
  size: number
  uid?: string
}

const visible = ref(false)
const confirmLoading = ref(false)
const fileList = ref<FileItem[]>([])
const currentStep = ref(0) // 0: 上传, 1: 裁剪, 2: 水印, 3: 压缩
const currentImageUrl = ref('')
const currentImageType = ref('png')
const currentImageIndex = ref(0)
const cropperRef = ref()
const currentCropSize = ref('0 B')
const compressorRef = ref()
const watermarkRef = ref()
const currentImageSize = ref(0)
const lastCroppedData = ref('') // Store last cropped data
const originalImageUrl = ref('') // Store original image URL

const beforeUpload: UploadProps['beforeUpload'] = file => {
  const isImage = /^image\/(jpeg|png|gif|webp)$/.test(file.type)
  if (!isImage) {
    message.error('只能上传图片文件！')
    return false
  }
  return false // 阻止自动上传
}

const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
  console.log('文件列表变更:', newFileList)
  fileList.value = newFileList.map(item => ({
    originFileObj: item.originFileObj as File,
    name: item.name,
    status: 'done',
    size: item.size || 0,
    uid: item.uid
  }))
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  const files = Array.from(e.dataTransfer?.files || [])
  const validFiles = files.filter(file => {
    const isImage = /^image\/(jpeg|png|gif|webp)$/.test(file.type)
    return isImage
  })

  if (validFiles.length !== files.length) {
    message.warning('只能上传图片文件，非图片文件已被过滤')
  }

  fileList.value = validFiles.map(file => ({
    originFileObj: file,
    name: `${file.name} (${formatFileSize(file.size)})`,
    status: 'done',
    size: file.size
  }))
}

// 开始裁剪流程
const startCropping = async () => {
  if (currentImageIndex.value < fileList.value.length) {
    const file = fileList.value[currentImageIndex.value].originFileObj
    console.log('开始裁剪文件:', file.name)
    currentImageType.value = file.type.split('/')[1]
    try {
      currentStep.value = 1 // 先切换到裁剪步骤
      const dataUrl = await readFileAsDataURL(file)
      console.log('图片读取成功，准备设置URL')
      // 确保在下一个事件循环中设置URL
      setTimeout(() => {
        currentImageUrl.value = dataUrl
        originalImageUrl.value = dataUrl // 保存原始图片URL
        console.log('图片URL已设置')
      }, 100)
    } catch (error) {
      console.error('读取文件失败:', error)
      message.error('读取文件失败')
      currentStep.value = 0
    }
  }
}

// 将File对象转换为DataURL
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      console.log('文件读取完成，DataURL长度:', result.length)
      resolve(result)
    }
    reader.onerror = error => {
      console.error('文件读取失败:', error)
      reject(error)
    }
    reader.readAsDataURL(file)
  })
}

// 处理裁剪后的图片数据并上传
// 处理去压缩按钮点击
const handleGoCompress = (imageData: string) => {
  lastCroppedData.value = imageData // 保存裁剪数据
  currentStep.value = 3
  currentImageUrl.value = imageData
  // 计算当前图片大小
  const base64Data = imageData.split(',')[1]
  currentImageSize.value = atob(base64Data).length
}

// 处理去水印按钮点击
const handleGoWatermark = (imageData: string) => {
  lastCroppedData.value = imageData // 保存裁剪数据
  currentStep.value = 2
  currentImageUrl.value = imageData
  // 计算当前图片大小
  const base64Data = imageData.split(',')[1]
  currentImageSize.value = atob(base64Data).length
}

// 处理压缩确认
const handleCompressConfirm = async (data: { dataUrl: string; quality: number; size: number }) => {
  try {
    // 将base64转换为File对象
    const originalName = fileList.value[currentImageIndex.value].originFileObj.name
    const file = await dataURLtoFile(data.dataUrl, originalName)

    // 立即上传压缩后的图片
    confirmLoading.value = true
    try {
      const uploadedFiles =
        currentStorageType.value === 'qiniu'
          ? await uploadToQiniu([file], selectedUploadPath.value)
          : await uploadImages([file], selectedUploadPath.value)
      message.success(`${originalName} 上传成功 (${formatFileSize(file.size)})`)
      emit('success', uploadedFiles)
    } catch (error: unknown) {
      console.error('上传失败:', error)
      const errorMessage =
        (error &&
          typeof error === 'object' &&
          'response' in error &&
          (error as { response?: { data?: { error?: string } } }).response?.data?.error) ||
        `${file.name} 上传失败`
      const errorDetails =
        (error &&
          typeof error === 'object' &&
          'response' in error &&
          (error as { response?: { data?: { details?: string } } }).response?.data?.details) ||
        ''
      message.error(`${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}`)
      return
    } finally {
      confirmLoading.value = false
    }

    // 处理下一张图片
    currentImageIndex.value++
    if (currentImageIndex.value < fileList.value.length) {
      currentStep.value = 1
      startCropping()
    } else {
      // 所有图片处理完成，关闭弹窗
      handleCancel()
    }
  } catch (error) {
    console.error('处理压缩数据失败:', error)
    message.error('处理压缩数据失败')
  }
}

// 处理压缩取消 - 可以回到水印步骤或裁剪步骤
const handleCompressCancel = () => {
  // 回到裁剪步骤，并恢复裁剪后的预览状态
  currentStep.value = 1
  // 延迟调用以确保组件已经重新渲染
  setTimeout(() => {
    const cropperInstance = cropperRef.value
    if (lastCroppedData.value && cropperInstance) {
      cropperInstance.setPreviewMode(lastCroppedData.value)
    }
  }, 100)
}

// 处理水印确认
const handleWatermarkConfirm = async (data: {
  dataUrl: string
  size: number
  watermarkText: string
  settings: Record<string, unknown>
}) => {
  try {
    // 将base64转换为File对象
    const originalName = fileList.value[currentImageIndex.value].originFileObj.name
    const file = await dataURLtoFile(data.dataUrl, originalName)

    // 立即上传添加水印后的图片
    confirmLoading.value = true
    try {
      const uploadedFiles =
        currentStorageType.value === 'qiniu'
          ? await uploadToQiniu([file], selectedUploadPath.value)
          : await uploadImages([file], selectedUploadPath.value)
      message.success(`${originalName} 水印添加并上传成功 (${formatFileSize(file.size)})`)
      emit('success', uploadedFiles)
    } catch (error: unknown) {
      console.error('上传失败:', error)
      const errorMessage =
        (error &&
          typeof error === 'object' &&
          'response' in error &&
          (error as { response?: { data?: { error?: string } } }).response?.data?.error) ||
        `${file.name} 上传失败`
      const errorDetails =
        (error &&
          typeof error === 'object' &&
          'response' in error &&
          (error as { response?: { data?: { details?: string } } }).response?.data?.details) ||
        ''
      message.error(`${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}`)
      return
    } finally {
      confirmLoading.value = false
    }

    // 处理下一张图片
    currentImageIndex.value++
    if (currentImageIndex.value < fileList.value.length) {
      currentStep.value = 1
      startCropping()
    } else {
      // 所有图片处理完成，关闭弹窗
      handleCancel()
    }
  } catch (error) {
    console.error('处理水印数据失败:', error)
    message.error('处理水印数据失败')
  }
}

// 处理水印取消
const handleWatermarkCancel = () => {
  // 回到裁剪步骤，并恢复裁剪后的预览状态
  currentStep.value = 1
  // 延迟调用以确保组件已经重新渲染
  setTimeout(() => {
    const cropperInstance = cropperRef.value
    if (lastCroppedData.value && cropperInstance) {
      cropperInstance.setPreviewMode(lastCroppedData.value)
    }
  }, 100)
}

// 处理水印后去压缩
const handleWatermarkGoCompress = (imageData: string) => {
  // 注意：这里不更新 lastCroppedData，因为我们想保持原始的裁剪数据
  // 这样取消压缩时可以回到裁剪状态而不是水印状态
  currentStep.value = 3
  currentImageUrl.value = imageData
  // 计算当前图片大小
  const base64Data = imageData.split(',')[1]
  currentImageSize.value = atob(base64Data).length
}

const handleCropped = async () => {
  try {
    // 优先获取已确认的裁剪数据，如果没有则获取当前裁剪区域的数据
    const cropperInstance = cropperRef.value
    if (!cropperInstance) {
      message.error('裁剪器未初始化')
      return
    }

    let data = cropperInstance.getCropData()
    if (!data) {
      data = await cropperInstance.getCurrentCropData()
    }
    if (!data) {
      message.error('获取裁剪数据失败')
      return
    }

    // 将base64转换为File对象
    const originalName = fileList.value[currentImageIndex.value].originFileObj.name
    const file = await dataURLtoFile(data, originalName)

    // 立即上传当前裁剪的图片
    confirmLoading.value = true
    try {
      const uploadedFiles =
        currentStorageType.value === 'qiniu'
          ? await uploadToQiniu([file], selectedUploadPath.value)
          : await uploadImages([file], selectedUploadPath.value)
      message.success(`${originalName} 上传成功 (${formatFileSize(file.size)})`)
      emit('success', uploadedFiles)
    } catch (error: unknown) {
      console.error('上传失败:', error)
      const errorMessage =
        (error &&
          typeof error === 'object' &&
          'response' in error &&
          (error as { response?: { data?: { error?: string } } }).response?.data?.error) ||
        `${file.name} 上传失败`
      const errorDetails =
        (error &&
          typeof error === 'object' &&
          'response' in error &&
          (error as { response?: { data?: { details?: string } } }).response?.data?.details) ||
        ''
      message.error(`${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}`)
      return
    } finally {
      confirmLoading.value = false
    }

    // 处理下一张图片
    currentImageIndex.value++
    if (currentImageIndex.value < fileList.value.length) {
      startCropping()
    } else {
      // 所有图片处理完成，关闭弹窗
      handleCancel()
    }
  } catch (error) {
    console.error('处理裁剪数据失败:', error)
    message.error('处理裁剪数据失败')
  }
}

// 将base64数据转换为File对象
const dataURLtoFile = async (dataurl: string, filename: string): Promise<File> => {
  const arr = dataurl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

const handleOk = async () => {
  if (fileList.value.length === 0) {
    message.warning('请选择要上传的图片')
    return
  }

  if (currentStep.value === 0) {
    // 开始裁剪流程
    currentImageIndex.value = 0
    startCropping()
  } else if (currentStep.value === 1) {
    // 在裁剪步骤中，点击确定按钮时获取裁剪结果并上传
    await handleCropped()
  } else if (currentStep.value === 2) {
    // 在水印步骤中，触发水印组件的确认方法
    const watermarkInstance = watermarkRef.value
    if (watermarkInstance) {
      await watermarkInstance.handleConfirm()
    }
  } else if (currentStep.value === 3) {
    // 在压缩步骤中，触发压缩组件的确认方法
    const compressorInstance = compressorRef.value
    if (compressorInstance) {
      await compressorInstance.handleConfirm()
    }
  }
}

// 处理裁剪区域变化
const handleCropChange = async () => {
  try {
    const cropperInstance = cropperRef.value
    if (!cropperInstance) {
      return
    }
    const data = await cropperInstance.getCurrentCropData()
    if (data) {
      // 从base64数据计算大小
      const base64Data = data.split(',')[1]
      const binarySize = atob(base64Data).length
      currentCropSize.value = formatFileSize(binarySize)
    }
  } catch (error) {
    console.error('获取裁剪数据失败:', error)
  }
}

const handleCancel = () => {
  fileList.value = []
  currentStep.value = 0
  currentImageIndex.value = 0
  currentCropSize.value = '0 B'
  currentImageSize.value = 0
  lastCroppedData.value = '' // Clear saved cropped data
  originalImageUrl.value = '' // Clear original image URL
  currentStorageType.value = props.storageType // Reset storage type
  selectedUploadPath.value = props.uploadPath || '' // Reset upload path
  visible.value = false
  emit('cancel')
}

// 暴露方法给父组件
defineExpose({
  show: (files?: File[]) => {
    visible.value = true
    currentStorageType.value = props.storageType // Reset storage type when showing
    selectedUploadPath.value = props.uploadPath || '' // Reset upload path
    initDirectoryBreadcrumbs()

    // If files are provided, add them to the file list
    if (files && files.length > 0) {
      fileList.value = files.map(file => ({
        originFileObj: file,
        name: file.name,
        status: 'done',
        size: file.size,
        uid: `${Date.now()}-${Math.random()}`
      }))
    }
  }
})
</script>

<style scoped>
.upload-container {
  padding: 16px;
  height: 100%;
}

:deep(.ant-modal-content) {
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}

:deep(.ant-modal-body) {
  flex: 1;
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.storage-switcher {
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.upload-tip {
  margin-bottom: 16px;
  padding: 8px 12px;
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1890ff;
}

.crop-step {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 600px; /* 设置固定高度 */
}

.watermark-step {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 600px; /* 设置固定高度 */
}

.crop-info {
  font-size: 14px;
  color: #666;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.size-info {
  display: flex;
  justify-content: center;
  gap: 24px;
  color: #1890ff;
  font-size: 13px;
}

:deep(.ant-upload-drag) {
  height: 250px;
}

.directory-selection {
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.directory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.directory-label {
  font-weight: 500;
  color: #333;
}

.directory-path {
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
}

.directory-modal-content {
  padding: 16px 0;
}

.directory-list {
  margin-top: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.directory-list-item {
  cursor: pointer;
  transition: background 0.3s;
}

.directory-list-item:hover {
  background: #f5f5f5;
}
</style>
