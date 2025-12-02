<template>
  <div class="qiniu-image-list">
    <!-- Breadcrumb Navigation with Search -->
    <breadcrumb
      :breadcrumbs="breadcrumbs"
      :search-value="searchKeyword"
      @navigate="handleBreadcrumbNavigate"
      @search="handleSearch"
    />

    <div class="toolbar">
      <div class="toolbar-left">
        <a-space>
          <a-button v-if="!selectionMode" type="primary" @click="showUploadModal">
            <template #icon><upload-outlined /></template>
            上传图片
          </a-button>
          <a-button v-if="!selectionMode" @click="showCreateDirectoryModal">
            <template #icon><folder-add-outlined /></template>
            创建目录
          </a-button>
          <a-button @click="handleRefresh" :loading="refreshLoading">
            <template #icon><reload-outlined /></template>
            刷新
          </a-button>
        </a-space>
        <upload-modal
          ref="uploadModal"
          @success="handleUploadSuccess"
          :upload-path="currentPath || ''"
          :storage-type="'qiniu'"
        />
        <copy-format-modal ref="copyFormatModal" :image="currentImage" />
        <rename-modal
          ref="renameModal"
          @ok="handleRenameSubmit"
          @cancel="handleRenameCancel"
          :current-path="currentRenameImage?.path"
          :storage-type="'qiniu'"
        />
        <create-directory-modal
          ref="createDirectoryModal"
          :current-path="currentPath"
          @success="handleCreateDirectorySuccess"
        />
      </div>
      <div v-if="!selectionMode" class="toolbar-right">
        <a-space>
          <a-button v-if="!batchMode" type="primary" ghost @click="batchMode = true">
            批量操作
          </a-button>
          <template v-else>
            <a-space>
              <a-button
                type="primary"
                :disabled="!selectedImages.length"
                @click="handleBatchDownload"
              >
                下载选中 ({{ selectedImages.length }})
              </a-button>
              <a-button
                danger
                type="primary"
                :disabled="!selectedImages.length"
                @click="handleBatchDelete"
              >
                删除选中 ({{ selectedImages.length }})
              </a-button>
              <a-button @click="cancelBatchMode"> 取消 </a-button>
            </a-space>
          </template>
        </a-space>
      </div>
    </div>

    <div class="list-content">
      <a-spin :spinning="loading">
        <div v-if="directoryItems.length === 0" class="empty-directory">
          <a-empty description="当前目录为空" />
        </div>

        <div v-else class="directory-grid">
          <!-- Directory Items -->
          <div
            v-for="item in directoryItems"
            :key="item.path"
            class="directory-item"
            :class="{
              'directory-folder': item.type === 'directory',
              'directory-file': item.type === 'file',
              'item-selected':
                batchMode && item.type === 'file' && selectedImages.includes(item.path)
            }"
            @click="handleItemClick(item)"
          >
            <div v-if="batchMode && item.type === 'file'" class="item-select">
              <a-checkbox
                :checked="selectedImages.includes(item.path)"
                @change="(e: Event & { target: HTMLInputElement }) => handleImageSelect(e, item)"
                @click.stop
              />
            </div>

            <div class="item-icon">
              <folder-outlined v-if="item.type === 'directory'" class="folder-icon" />
              <div v-else class="image-preview">
                <a-image :src="item.path" :alt="item.name" class="preview-image" />
              </div>
            </div>

            <div class="item-info">
              <div class="item-name" :title="item.name">{{ item.name }}</div>
              <div class="item-meta">
                <span v-if="item.type === 'directory'" class="item-type">文件夹</span>
                <span v-else-if="item.modifyTime" class="item-date">
                  {{ formatDate(item.modifyTime) }}
                </span>
              </div>
            </div>

            <!-- File actions -->
            <div v-if="item.type === 'file' && !selectionMode" class="item-actions" @click.stop>
              <a-space>
                <a-tooltip title="复制">
                  <copy-outlined @click="handleCopy(item)" />
                </a-tooltip>
                <a-tooltip title="下载">
                  <download-outlined @click="handleDownload(item)" />
                </a-tooltip>
                <a-tooltip title="重命名">
                  <edit-outlined @click="handleRename(item)" />
                </a-tooltip>
                <a-tooltip title="删除">
                  <delete-outlined class="delete-icon" @click="handleDelete(item)" />
                </a-tooltip>
              </a-space>
            </div>

            <!-- Selection mode indicator -->
            <div v-if="item.type === 'file' && selectionMode" class="item-select-indicator">
              <check-outlined class="check-icon" />
              <span>点击选择</span>
            </div>

            <!-- Directory actions -->
            <div
              v-if="item.type === 'directory'"
              class="item-actions directory-actions"
              @click.stop
            >
              <a-tooltip title="删除目录">
                <a-popconfirm
                  title="目录下的所有文件都将被删除，确定执行删除操作吗？"
                  ok-text="确定"
                  cancel-text="取消"
                  @confirm="handleDeleteDirectory(item)"
                  placement="topRight"
                >
                  <delete-outlined class="delete-icon" />
                </a-popconfirm>
              </a-tooltip>
            </div>
          </div>
        </div>
      </a-spin>

      <!-- Pagination Component - standard pagination with prev/next navigation -->
      <div
        v-if="
          pagination.hasMore ||
          pagination.hasPrevious ||
          (pagination.total !== undefined && pagination.total > pagination.pageSize)
        "
        class="pagination-container"
      >
        <div class="pagination-info">
          <span v-if="pagination.total !== undefined && pagination.total > 0"
            >共 {{ pagination.total }} 项</span
          >
          <span v-else-if="pagination.hasMore">第 {{ pagination.current }} 页（可能有更多）</span>
        </div>
        <div class="pagination-controls">
          <a-space>
            <span>每页显示：</span>
            <a-select
              v-model:value="pagination.pageSize"
              style="width: 80px"
              @change="handlePageSizeChange"
            >
              <a-select-option :value="10">10</a-select-option>
              <a-select-option :value="20">20</a-select-option>
              <a-select-option :value="50">50</a-select-option>
              <a-select-option :value="100">100</a-select-option>
            </a-select>
            <span>项</span>

            <!-- Navigation buttons -->
            <a-button
              :disabled="!pagination.hasPrevious"
              @click="handlePreviousPage"
              :loading="loading"
            >
              上一页
            </a-button>

            <span class="current-page">第 {{ pagination.current }} 页</span>

            <a-button
              :disabled="!pagination.hasMore"
              type="primary"
              @click="handleNextPage"
              :loading="loading"
            >
              下一页
            </a-button>
          </a-space>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import {
  UploadOutlined,
  CopyOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  FolderAddOutlined,
  ReloadOutlined,
  CheckOutlined
} from '@ant-design/icons-vue'
import {
  getQiniuImages,
  deleteQiniuImage,
  renameQiniuImage,
  downloadQiniuImage,
  createQiniuDirectory,
  deleteQiniuDirectory
} from '@/services/images'
import type {
  DirectoryItem,
  Breadcrumb as BreadcrumbType,
  DirectoryContents,
  PaginationInfo
} from '@/services/images'
import { message, Modal } from 'ant-design-vue'
import UploadModal from '@/components/image/UploadModal.vue'
import CopyFormatModal from '@/components/image/CopyFormatModal.vue'
import RenameModal from '@/components/image/RenameModal.vue'
import CreateDirectoryModal from '@/components/image/CreateDirectoryModal.vue'
import Breadcrumb from '@/components/common/Breadcrumb.vue'

interface Props {
  selectionMode?: boolean // Selection mode for picking images
}

const props = withDefaults(defineProps<Props>(), {
  selectionMode: false
})

const emit = defineEmits<{
  (e: 'select', imageUrl: string): void
}>()

const loading = ref(false)
const refreshLoading = ref(false)
const batchMode = ref(false)
const selectedImages = ref<string[]>([])
const currentImage = ref<DirectoryItem | null>(null)
const copyFormatModal = ref()

// Directory navigation state
const currentPath = ref('')
const directoryItems = ref<DirectoryItem[]>([])
const breadcrumbs = ref<BreadcrumbType[]>([])

// Search state
const searchKeyword = ref('')
const isSearching = ref(false)

// Pagination state
const pagination = ref<PaginationInfo>({
  current: 1,
  pageSize: 20,
  total: 0,
  hasMore: false,
  hasPrevious: false,
  nextMarker: null
})

// Marker history for navigation - stores markers for each page
const markerHistory = ref<Map<number, string>>(new Map())

// Upload and rename modals
const uploadModal = ref()
const renameModal = ref()
const createDirectoryModal = ref()
const currentRenameImage = ref<DirectoryItem | null>(null)

// Fetch Qiniu directory contents with pagination and search support
const fetchQiniuContents = async (
  prefix?: string,
  page?: number,
  pageSize?: number,
  marker?: string,
  resetPagination: boolean = true,
  search?: string
) => {
  loading.value = true
  try {
    const currentPage = page || pagination.value.current
    const currentPageSize = pageSize || pagination.value.pageSize

    const data: DirectoryContents = await getQiniuImages(
      prefix,
      currentPage,
      currentPageSize,
      marker,
      search || ''
    )

    directoryItems.value = data.items
    breadcrumbs.value = data.breadcrumbs
    currentPath.value = data.currentPath

    // Update pagination info
    if (data.pagination) {
      pagination.value = { ...data.pagination }

      // Store marker for next page navigation
      if (data.pagination.nextMarker && data.pagination.hasMore) {
        markerHistory.value.set(currentPage + 1, data.pagination.nextMarker)
      }
    }

    // Clear selection when navigating or reset pagination
    if (resetPagination) {
      selectedImages.value = []
      batchMode.value = false
      markerHistory.value.clear() // Clear marker history when navigating to new directory
    }
  } catch (error: unknown) {
    console.error('获取七牛云图片列表失败:', error)
    const errorMessage =
      (error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { error?: string } } }).response?.data?.error) ||
      (error instanceof Error ? error.message : '获取七牛云图片列表失败')
    message.error(errorMessage as string)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchQiniuContents()
})

// Navigation methods
const handleItemClick = (item: DirectoryItem) => {
  if (item.type === 'directory') {
    // Reset pagination when navigating to directory
    pagination.value.current = 1
    pagination.value.nextMarker = null
    fetchQiniuContents(item.path, 1)
  } else if (item.type === 'file' && props.selectionMode) {
    // In selection mode, emit select event for files
    emit('select', item.path)
  }
  // For files in normal mode, do nothing on click (actions are handled by buttons)
}

const handleBreadcrumbNavigate = (path: string) => {
  // Reset pagination when navigating to different directory
  pagination.value.current = 1
  pagination.value.nextMarker = null
  // Clear search when navigating
  searchKeyword.value = ''
  isSearching.value = false
  fetchQiniuContents(path, 1)
}

// Handle search functionality
const handleSearch = async (keyword: string) => {
  searchKeyword.value = keyword
  isSearching.value = !!keyword

  // Reset pagination when searching
  pagination.value.current = 1
  pagination.value.nextMarker = null
  markerHistory.value.clear()

  try {
    await fetchQiniuContents(
      currentPath.value,
      1,
      pagination.value.pageSize,
      undefined,
      false,
      keyword
    )
  } catch (error) {
    console.error('Search failed:', error)
    message.error('搜索失败')
  }
}

// Refresh current directory data
const handleRefresh = async () => {
  refreshLoading.value = true
  try {
    await fetchQiniuContents(
      currentPath.value,
      pagination.value.current,
      pagination.value.pageSize,
      undefined,
      false,
      searchKeyword.value
    )
  } finally {
    refreshLoading.value = false
  }
}

// Handle page size change
const handlePageSizeChange = (size: number) => {
  pagination.value.current = 1 // Reset to first page when changing page size
  pagination.value.pageSize = size
  markerHistory.value.clear() // Clear marker history when changing page size
  fetchQiniuContents(currentPath.value, 1, size, undefined, false, searchKeyword.value)
}

// Navigate to next page
const handleNextPage = () => {
  if (pagination.value.hasMore) {
    const nextPage = pagination.value.current + 1
    const nextMarker = markerHistory.value.get(nextPage)
    fetchQiniuContents(
      currentPath.value,
      nextPage,
      pagination.value.pageSize,
      nextMarker,
      false,
      searchKeyword.value
    )
  }
}

// Navigate to previous page
const handlePreviousPage = () => {
  if (pagination.value.hasPrevious) {
    const prevPage = pagination.value.current - 1
    const prevMarker = prevPage === 1 ? undefined : markerHistory.value.get(prevPage)
    fetchQiniuContents(
      currentPath.value,
      prevPage,
      pagination.value.pageSize,
      prevMarker,
      false,
      searchKeyword.value
    )
  }
}

const showUploadModal = () => {
  uploadModal.value?.show()
}

const handleUploadSuccess = async (uploadedFiles: DirectoryItem[]) => {
  message.success(`成功上传 ${uploadedFiles.length} 个文件`)
  // Refresh current directory
  await fetchQiniuContents(
    currentPath.value,
    undefined,
    undefined,
    undefined,
    true,
    searchKeyword.value
  )
}

// Batch operations
const handleImageSelect = (e: Event & { target: HTMLInputElement }, item: DirectoryItem): void => {
  if (item.type !== 'file') return

  if (e.target.checked) {
    selectedImages.value.push(item.path)
  } else {
    selectedImages.value = selectedImages.value.filter(path => path !== item.path)
  }
}

const cancelBatchMode = () => {
  batchMode.value = false
  selectedImages.value = []
}

const handleBatchDelete = async () => {
  if (selectedImages.value.length === 0) return

  try {
    const confirmed = await new Promise(resolve => {
      Modal.confirm({
        title: '确认批量删除',
        content: `确定要删除选中的 ${selectedImages.value.length} 张图片吗？`,
        okText: '确定',
        cancelText: '取消',
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      })
    })

    if (!confirmed) return

    loading.value = true

    // Batch delete selected images
    await Promise.all(selectedImages.value.map(imagePath => deleteQiniuImage(imagePath)))

    message.success(`成功删除 ${selectedImages.value.length} 张图片`)
    selectedImages.value = []
    batchMode.value = false
    await fetchQiniuContents(
      currentPath.value,
      undefined,
      undefined,
      undefined,
      true,
      searchKeyword.value
    )
  } catch (error) {
    console.error('批量删除失败:', error)
    message.error('批量删除失败')
  } finally {
    loading.value = false
  }
}

const handleDownload = async (item: DirectoryItem) => {
  if (item.type === 'file') {
    try {
      await downloadQiniuImage(item.path)
      message.success('下载成功')
    } catch (error) {
      console.error('下载失败:', error)
      message.error('下载失败')
    }
  }
}

const handleCopy = async (item: DirectoryItem) => {
  if (item.type === 'file') {
    currentImage.value = item
    // Wait for reactive updates to complete before showing modal
    await nextTick()
    copyFormatModal.value?.show()
  }
}

const handleBatchDownload = async () => {
  if (selectedImages.value.length === 0) return

  loading.value = true
  try {
    const selectedImageItems = directoryItems.value.filter(
      item => item.type === 'file' && selectedImages.value.includes(item.path)
    )

    // Create delay function to avoid browser blocking multiple downloads
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // Download images one by one with 500ms interval
    for (const item of selectedImageItems) {
      await downloadQiniuImage(item.path)
      await delay(500)
    }

    message.success(`已开始下载 ${selectedImages.value.length} 张图片`)
  } catch (error) {
    console.error('批量下载失败:', error)
    message.error('批量下载失败')
  } finally {
    loading.value = false
  }
}

const handleRename = (item: DirectoryItem) => {
  if (item.type === 'file') {
    currentRenameImage.value = item
    // Remove file extension
    const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf('.'))
    renameModal.value?.show(nameWithoutExt)
  }
}

const handleRenameSubmit = async (newName: string) => {
  if (!currentRenameImage.value) return

  try {
    loading.value = true
    if (!newName || newName === currentRenameImage.value.name) {
      throw new Error('请输入新的名称')
    }

    await renameQiniuImage(currentRenameImage.value.path, newName)
    message.success('重命名成功')
    await fetchQiniuContents(
      currentPath.value,
      undefined,
      undefined,
      undefined,
      true,
      searchKeyword.value
    )
    loading.value = false
    currentRenameImage.value = null
    return true
  } catch (error: unknown) {
    console.error('重命名失败:', error)
    const errorMessage =
      (error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { error?: string } } }).response?.data?.error) ||
      (error instanceof Error ? error.message : '重命名失败')
    renameModal.value?.setError(errorMessage)
    loading.value = false
    throw error
  }
}

const handleRenameCancel = () => {
  currentRenameImage.value = null
}

const handleDelete = async (item: DirectoryItem) => {
  if (item.type !== 'file') return

  try {
    // Show confirmation dialog
    const confirmed = await new Promise(resolve => {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除图片 "${item.name}" 吗？`,
        okText: '确定',
        cancelText: '取消',
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      })
    })

    if (!confirmed) return

    loading.value = true
    await deleteQiniuImage(item.path)
    message.success('删除成功')
    await fetchQiniuContents(
      currentPath.value,
      undefined,
      undefined,
      undefined,
      true,
      searchKeyword.value
    )
  } catch (error) {
    console.error('删除图片失败:', error)
    message.error('删除图片失败')
  } finally {
    loading.value = false
  }
}

// Show create directory modal
const showCreateDirectoryModal = () => {
  createDirectoryModal.value?.show()
}

// Handle create directory success
const handleCreateDirectorySuccess = async (directoryName: string) => {
  try {
    loading.value = true
    await createQiniuDirectory(currentPath.value || '', directoryName)
    message.success('目录创建成功')
    // Close modal and refresh current directory
    createDirectoryModal.value?.handleCancel()
    await fetchQiniuContents(
      currentPath.value,
      undefined,
      undefined,
      undefined,
      true,
      searchKeyword.value
    )
  } catch (error: unknown) {
    console.error('创建目录失败:', error)
    const errorMessage =
      (error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { error?: string } } }).response?.data?.error) ||
      (error instanceof Error ? error.message : '创建目录失败')
    message.error(errorMessage as string)
  } finally {
    loading.value = false
  }
}

// Handle delete directory
const handleDeleteDirectory = async (item: DirectoryItem) => {
  if (item.type !== 'directory') return

  try {
    loading.value = true
    await deleteQiniuDirectory(item.path)
    message.success('目录删除成功')
    // Refresh current directory
    await fetchQiniuContents(
      currentPath.value,
      undefined,
      undefined,
      undefined,
      true,
      searchKeyword.value
    )
  } catch (error: unknown) {
    console.error('删除目录失败:', error)
    const errorMessage =
      (error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { error?: string } } }).response?.data?.error) ||
      (error instanceof Error ? error.message : '删除目录失败')
    message.error(errorMessage as string)
  } finally {
    loading.value = false
  }
}

// Format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 1) {
    return '今天'
  } else if (diffDays === 2) {
    return '昨天'
  } else if (diffDays <= 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }
}
</script>

<style scoped>
.qiniu-image-list {
  height: 100%;
}

.toolbar {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-content {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  min-height: 300px;
}

.empty-directory {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.directory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.directory-item {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
  aspect-ratio: 0.9; /* Slightly taller to accommodate info */
  display: flex;
  flex-direction: column;
  min-height: 240px;
}

.directory-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: #d9d9d9;
}

.directory-folder {
  background: linear-gradient(135deg, #f6f9fc 0%, #e9f4ff 100%);
  border-color: #d6e4ff;
}

.directory-folder:hover {
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  border-color: #91d5ff;
}

.directory-file {
  background: #fff;
}

.item-selected {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.item-select {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  padding: 4px;
}

.item-icon {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  min-height: 0; /* Allow flex item to shrink */
  max-height: calc(100% - 92px); /* Reserve space for info and actions */
  overflow: hidden; /* Prevent content overflow */
  position: relative;
}

.folder-icon {
  font-size: 48px;
  color: #1890ff;
}

.image-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  overflow: hidden; /* Prevent image overflow */
  position: relative;
}

.preview-image {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-image :deep(img) {
  max-width: 100%;
  max-height: 100%;
  width: auto !important;
  height: auto !important;
  object-fit: contain;
  transition: transform 0.3s;
  position: relative;
  z-index: 1;
}

.directory-item:hover .preview-image :deep(img) {
  transform: scale(1.05);
}

.item-info {
  padding: 12px 12px 8px 12px;
  border-top: 1px solid #f0f0f0;
  background: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
  flex-shrink: 0; /* Prevent shrinking */
  min-height: 52px; /* Ensure minimum height */
}

.item-name {
  font-size: 14px;
  color: #262626;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  line-height: 1.2;
}

.item-meta {
  font-size: 12px;
  color: #8c8c8c;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.item-type {
  color: #1890ff;
  font-weight: 500;
}

.item-date {
  color: #8c8c8c;
  font-weight: 400;
}

.item-actions {
  padding: 10px 12px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  justify-content: center;
  background: #fff;
  flex-shrink: 0; /* Prevent shrinking */
  min-height: 40px; /* Ensure minimum height */
}

.item-actions .anticon {
  padding: 5px;
  border-radius: 4px;
  transition: all 0.3s;
  cursor: pointer;
  font-size: 14px;
}

.item-actions .anticon:hover {
  background: #f5f5f5;
  transform: scale(1.1);
}

.delete-icon {
  color: #ff4d4f;
}

.delete-icon:hover {
  background: #fff2f0 !important;
}

/* Directory actions - hidden by default, shown on hover */
.directory-actions {
  opacity: 0;
  transition: opacity 0.3s;
}

.directory-item:hover .directory-actions {
  opacity: 1;
}

.item-select-indicator {
  padding: 10px 12px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  background: #f0f9ff;
  flex-shrink: 0;
  min-height: 40px;
  color: #1890ff;
  font-size: 14px;
  transition: all 0.3s;
}

.directory-item:hover .item-select-indicator {
  background: #e6f7ff;
}

.check-icon {
  font-size: 16px;
}

:deep(.ant-checkbox-wrapper) {
  pointer-events: auto;
}

:deep(.ant-image-mask) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

:deep(.ant-image-mask-info) {
  text-align: center;
  padding: 0 8px;
}

/* Pagination styles */
.pagination-container {
  margin-top: 24px;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.pagination-info {
  color: #666;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
}

.current-page {
  padding: 0 12px;
  font-weight: 500;
  color: #1890ff;
}

/* Responsive design for better layout on different screen sizes */
@media (max-width: 768px) {
  .directory-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }

  .directory-item {
    min-height: 200px;
  }
}

@media (min-width: 1200px) {
  .directory-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 18px;
  }

  .directory-item {
    min-height: 260px;
  }
}
</style>
