import http from '@/utils/request'

// Common types
export interface ImageInfo {
  path: string
  name: string
  createTime: string
  modifyTime: string
  size?: number
}

export interface DirectoryItem {
  name: string
  type: 'file' | 'directory'
  path: string
  createTime?: string
  modifyTime?: string
  size?: number
}

export interface Breadcrumb {
  name: string
  path: string
}

export interface PaginationInfo {
  current: number
  pageSize: number
  total?: number
  hasMore?: boolean
  hasPrevious?: boolean
  nextMarker?: string | null
}

export interface DirectoryContents {
  items: DirectoryItem[]
  currentPath: string
  breadcrumbs: Breadcrumb[]
  pagination?: PaginationInfo
}

export interface DirectoryListData {
  directories: Array<{ name: string; path: string }>
  currentPath: string
  breadcrumbs: Breadcrumb[]
}

// Category types
export interface Topic {
  id: string
  title: string
  description: string
  path: string
  icon: string
  articleCount?: number
  categoryId?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  topics: Topic[]
}

// Topic types
export interface Article {
  slug: string
  title: string
  status?: string
}

export interface Chapter {
  title: string
  articles: Article[]
}

export interface TopicDetail {
  id: string
  categoryId: string
  name: string
  slug: string
  description: string
  image: string
  chapters: Chapter[]
}

export interface TopicListItem {
  id: string
  title: string
  description: string
  path: string
  icon: string
  articleCount: number
}

// Article types
export interface ArticleListItem {
  id: string
  title: string
  path: string
  createTime: string
  status?: string
  chapterTitle: string
}

export interface ArticleContent {
  content: string
  path: string
}

// Image config types
export interface QiniuConfig {
  accessKey: string
  secretKey: string
  bucket: string
  domain: string
  region: 'z0' | 'z1' | 'z2' | 'na0' | 'as0'
  urlSuffix?: string
  path?: string
}

export interface LocalConfig {
  path: string
}

export interface ImageConfig {
  localStorage: LocalConfig
  qiniuStorage: QiniuConfig
}

// ========== Category API ==========
export const categoryApi = {
  getCategories: () => http.get<{ categories: Category[] }>('/categories'),

  addCategory: (data: { title: string; slug: string }) =>
    http.post<Category>('/categories', data, { showSuccess: true }),

  updateCategory: (id: string, data: { title: string; slug: string }) =>
    http.put<Category>(`/categories/${id}`, data, { showSuccess: true }),

  deleteCategory: (id: string) => http.delete(`/categories/${id}`, { showSuccess: true }),

  updateCategoriesOrder: (categories: string[]) =>
    http.put('/categories/order/batch', { categories }, { showSuccess: true }),

  addTopic: (data: {
    name: string
    categoryId: string
    description?: string
    image?: string
    slug: string
  }) => http.post<Topic>('/categories/topics', data, { showSuccess: true })
}

// ========== Topic API ==========
export const topicApi = {
  listTopics: () => http.get<{ topics: TopicListItem[] }>('/topics'),

  getTopicDetail: (slug: string) => http.get<TopicDetail>(`/topic/${slug}`),

  updateTopicDetail: (slug: string, data: TopicDetail) =>
    http.put(`/topic/${slug}`, data, { showSuccess: true }),

  deleteTopic: (slug: string) => http.delete(`/topic/${slug}`, { showSuccess: true }),

  updateTopicsOrder: (topicsOrder: Array<{ categoryId: string; topicIds: string[] }>) =>
    http.put('/topics/order/batch', topicsOrder, { showSuccess: true })
}

// ========== Article API ==========
export const articleApi = {
  getTopicArticleList: (topicId: string) =>
    http.get<{ articles: ArticleListItem[] }>(`/topics/${topicId}/articles`),

  getArticleContent: (topicSlug: string, articleSlug: string) =>
    http.get<ArticleContent>(`/articles/${topicSlug}/${articleSlug}`),

  updateArticleContent: (topicSlug: string, articleSlug: string, content: string) =>
    http.put(`/articles/${topicSlug}/${articleSlug}`, { content }, { showSuccess: true })
}

// ========== Image API ==========
export const imageApi = {
  // Local storage
  getImageList: (search?: string) => http.get<ImageInfo[]>('/images/list', { params: { search } }),

  getDirectoryContents: (dirPath?: string, search?: string) =>
    http.get<DirectoryContents>('/images/directory', {
      params: { dirPath: dirPath || '', search: search || '' }
    }),

  uploadImages: (files: File[], uploadPath?: string) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    if (uploadPath) formData.append('uploadPath', uploadPath)
    return http.upload<ImageInfo[]>('/images/upload', formData)
  },

  deleteImage: (imagePath: string) =>
    http.post('/images/delete', { imagePath }, { showSuccess: true }),

  renameImage: (imagePath: string, newName: string) =>
    http.post<ImageInfo>('/images/rename', { imagePath, newName }, { showSuccess: true }),

  checkImageName: (imagePath: string, newName: string) =>
    http.post<boolean>('/images/check-name', { imagePath, newName }),

  createDirectory: (dirPath: string, directoryName: string) =>
    http.post('/images/create-directory', { dirPath, directoryName }, { showSuccess: true }),

  deleteDirectory: (directoryPath: string) =>
    http.post('/images/delete-directory', { directoryPath }, { showSuccess: true }),

  getLocalDirectories: (prefix?: string) =>
    http.get<DirectoryListData>('/images/directories', { params: { prefix: prefix || '' } }),

  // Qiniu storage
  getQiniuImages: (
    prefix?: string,
    page?: number,
    pageSize?: number,
    marker?: string,
    search?: string
  ) =>
    http.get<DirectoryContents>('/images/qiniu/list', {
      params: {
        prefix: prefix || '',
        page: page || 1,
        pageSize: pageSize || 20,
        marker: marker || '',
        search: search || ''
      }
    }),

  uploadToQiniu: (files: File[], uploadPath?: string) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    if (uploadPath) formData.append('uploadPath', uploadPath)
    return http.upload<ImageInfo[]>('/images/qiniu/upload', formData)
  },

  deleteQiniuImage: (imagePath: string) =>
    http.post('/images/qiniu/delete', { imagePath }, { showSuccess: true }),

  renameQiniuImage: (imagePath: string, newName: string) =>
    http.post<ImageInfo>('/images/qiniu/rename', { imagePath, newName }, { showSuccess: true }),

  downloadQiniuImage: async (imageUrl: string): Promise<void> => {
    const urlObj = new URL(imageUrl)
    const filename = urlObj.pathname.split('/').pop() || 'download'
    await http.download('/images/qiniu/download', filename, { params: { url: imageUrl } })
  },

  createQiniuDirectory: (dirPath: string, directoryName: string) =>
    http.post('/images/qiniu/create-directory', { dirPath, directoryName }, { showSuccess: true }),

  deleteQiniuDirectory: (directoryPath: string) =>
    http.post('/images/qiniu/delete-directory', { directoryPath }, { showSuccess: true }),

  getQiniuDirectories: (prefix?: string) =>
    http.get<DirectoryListData>('/images/qiniu/directories', { params: { prefix: prefix || '' } }),

  // Image config (read-only from environment variables)
  getImageConfig: () => http.get<ImageConfig>('/images/config'),

  testQiniuUpload: (config: QiniuConfig) => http.post('/images/qiniu/test-upload', config)
}
