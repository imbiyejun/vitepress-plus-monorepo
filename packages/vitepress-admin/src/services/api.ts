import http from '@/utils/request'
import { API_BASE_URL } from '@/config'

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

// Deploy types
export interface DeployStatus {
  configured: boolean
  host?: string
  remotePath?: string
}

export type DeployStepStatus = 'pending' | 'running' | 'success' | 'error'

export interface DeployStep {
  id: string
  title: string
  status: DeployStepStatus
  message?: string
  logs?: string[]
  startTime?: number
  endTime?: number
}

export interface DeployTask {
  id: string
  status: 'running' | 'success' | 'error'
  steps: DeployStep[]
  result?: {
    zipSize?: string
    remotePath?: string
    backupPath?: string
  }
  error?: string
  startTime: number
  endTime?: number
}

export interface DeployMessage {
  type: 'deploy:progress' | 'deploy:complete' | 'deploy:error'
  taskId: string
  task: DeployTask
}

export interface StartDeployResult {
  taskId: string
}

export interface TaskStatusResult {
  task: DeployTask | null
}

export interface ConnectionTestResult {
  connected: boolean
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

// ========== Deploy API ==========
export const deployApi = {
  getStatus: () => http.get<DeployStatus>('/deploy/status'),

  startDeploy: () => http.post<StartDeployResult>('/deploy/start', {}),

  getTaskStatus: () => http.get<TaskStatusResult>('/deploy/task'),

  testConnection: () => http.post<ConnectionTestResult>('/deploy/test-connection', {})
}

// ========== Server Management Types ==========
export interface ServerStatus {
  configured: boolean
  host?: string
  username?: string
}

export interface ServerFileInfo {
  name: string
  path: string
  type: 'file' | 'directory' | 'symlink'
  size: number
  mode: string
  modifyTime: string
  accessTime: string
  owner: number
  group: number
}

export interface ServerBreadcrumb {
  name: string
  path: string
}

export interface ServerDirectoryContents {
  items: ServerFileInfo[]
  currentPath: string
  breadcrumbs: ServerBreadcrumb[]
}

export interface FileContentResult {
  content: string
  path: string
  size: number
  encoding: string
}

export interface UploadResult {
  success: boolean
  filename: string
  remotePath: string
  size: number
  message?: string
}

export interface TerminalMessage {
  type:
    | 'terminal:data'
    | 'terminal:resize'
    | 'terminal:connect'
    | 'terminal:disconnect'
    | 'terminal:error'
  sessionId: string
  data?: string
  cols?: number
  rows?: number
  error?: string
}

// Server initialization types
export interface ServerInitConfig {
  domain?: string
  sslCertPath?: string
  sslKeyPath?: string
  enableSsl?: boolean
  webRoot?: string
  nodeVersion?: string
  serverIp?: string
}

export type InitStepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped'

export interface InitStep {
  id: string
  title: string
  status: InitStepStatus
  message?: string
  output?: string
  logs?: string[]
  startTime?: number
  endTime?: number
}

export interface InitTask {
  id: string
  status: 'running' | 'success' | 'error'
  steps: InitStep[]
  config: ServerInitConfig
  startTime: number
  endTime?: number
  error?: string
}

export interface InitMessage {
  type: 'init:progress' | 'init:complete' | 'init:error'
  taskId: string
  task: InitTask
}

export interface ServerEnvStatus {
  hasNginx: boolean
  hasNode: boolean
  hasPnpm: boolean
  hasGit: boolean
  hasPm2: boolean
  nodeVersion?: string
  nginxVersion?: string
  sslConfigured?: boolean
  domain?: string
  serverIp?: string
  remotePath?: string
}

// ========== Software Management Types ==========
export type SoftwareCategory = 'webserver' | 'runtime' | 'database' | 'tool'

export interface SoftwareInfo {
  id: string
  name: string
  description: string
  icon: string
  color: string
  category: SoftwareCategory
  installed: boolean
  version?: string
  configPaths: string[]
  serviceName?: string
}

export type SoftwareAction = 'install' | 'uninstall' | 'upgrade'

export interface SoftwareTaskStep {
  title: string
  status: InitStepStatus
  logs: string[]
  startTime?: number
  endTime?: number
}

export interface SoftwareTask {
  id: string
  softwareId: string
  softwareName: string
  action: SoftwareAction
  status: 'running' | 'success' | 'error'
  steps: SoftwareTaskStep[]
  startTime: number
  endTime?: number
  error?: string
}

export interface SoftwareMessage {
  type: 'software:progress' | 'software:complete' | 'software:error'
  taskId: string
  task: SoftwareTask
}

export interface SoftwareConfigResult {
  softwareId: string
  path: string
  content: string
}

// ========== Server API ==========
export const serverApi = {
  getStatus: () => http.get<ServerStatus>('/server/status'),

  testConnection: () => http.post<{ connected: boolean }>('/server/test-connection', {}),

  listDirectory: (path?: string) =>
    http.get<ServerDirectoryContents>('/server/directory', { params: { path: path || '/' } }),

  readFile: (path: string, maxSize?: number) =>
    http.get<FileContentResult>('/server/file', { params: { path, maxSize } }),

  writeFile: (path: string, content: string) =>
    http.put('/server/file', { path, content }, { showSuccess: true }),

  createDirectory: (path: string) =>
    http.post('/server/directory', { path }, { showSuccess: true }),

  deleteFile: (path: string) => http.delete('/server/file', { data: { path }, showSuccess: true }),

  deleteDirectory: (path: string, recursive?: boolean) =>
    http.delete('/server/directory', { data: { path, recursive }, showSuccess: true }),

  rename: (oldPath: string, newPath: string) =>
    http.post('/server/rename', { oldPath, newPath }, { showSuccess: true }),

  uploadFile: (file: File, remotePath: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('remotePath', remotePath)
    return http.upload<UploadResult>('/server/upload', formData)
  },

  uploadFiles: (files: File[], remotePath: string) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    formData.append('remotePath', remotePath)
    return http.upload<UploadResult[]>('/server/upload-multiple', formData)
  },

  downloadFile: async (remotePath: string): Promise<void> => {
    const filename = remotePath.split('/').pop() || 'download'
    await http.download('/server/download', filename, { params: { path: remotePath } })
  },

  // Server initialization
  getEnvStatus: () => http.get<ServerEnvStatus>('/server/init/env-status'),

  startInit: (config: ServerInitConfig) =>
    http.post<{ taskId: string }>('/server/init/start', config),

  getInitTask: () => http.get<{ task: InitTask | null }>('/server/init/task'),

  // Software management
  getSoftwareStatus: () => http.get<{ software: SoftwareInfo[] }>('/server/software/status'),

  executeSoftwareAction: (softwareId: string, action: SoftwareAction) =>
    http.post<{ taskId: string }>('/server/software/action', { softwareId, action }),

  getSoftwareTask: () => http.get<{ task: SoftwareTask | null }>('/server/software/task'),

  getSoftwareConfig: (softwareId: string, configPath: string) =>
    http.get<SoftwareConfigResult>('/server/software/config', {
      params: { softwareId, configPath }
    }),

  updateSoftwareConfig: (softwareId: string, configPath: string, content: string) =>
    http.put('/server/software/config', { softwareId, configPath, content }, { showSuccess: true })
}

// ========== Database Management Types ==========
export interface DatabaseStatus {
  configured: boolean
  host?: string
  port?: number
  username?: string
}

export interface DatabaseInfo {
  name: string
  tables?: number
}

export interface TableInfo {
  name: string
  rows: number | null
  engine: string | null
  collation: string | null
  size: string | null
  comment: string
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  key: string
  defaultValue: string | null
  extra: string
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  affectedRows: number
  message: string
  executionTime: number
}

export interface CreateTableColumn {
  name: string
  type: string
  length?: string
  nullable?: boolean
  defaultValue?: string
  autoIncrement?: boolean
  primaryKey?: boolean
  comment?: string
}

export interface TableDataQuery {
  database: string
  table: string
  page?: number
  pageSize?: number
  orderBy?: string
  orderDir?: 'ASC' | 'DESC'
  search?: string
}

export interface TableDataResult {
  columns: ColumnInfo[]
  rows: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  primaryKeys: string[]
}

// ========== Database API ==========
export const databaseApi = {
  getStatus: () => http.get<DatabaseStatus>('/database/status'),

  testConnection: () => http.post<{ connected: boolean }>('/database/test-connection', {}),

  listDatabases: () => http.get<{ databases: DatabaseInfo[] }>('/database/databases'),

  createDatabase: (name: string, charset?: string, collation?: string) =>
    http.post('/database/databases', { name, charset, collation }, { showSuccess: true }),

  dropDatabase: (name: string) =>
    http.delete('/database/databases', { data: { name }, showSuccess: true }),

  listTables: (database: string) =>
    http.get<{ tables: TableInfo[] }>('/database/tables', { params: { database } }),

  getTableColumns: (database: string, table: string) =>
    http.get<{ columns: ColumnInfo[] }>('/database/columns', { params: { database, table } }),

  executeQuery: (database: string, sql: string) =>
    http.post<QueryResult>('/database/query', { database, sql }),

  changePassword: (currentUsername: string, currentPassword: string, newPassword: string) =>
    http.post(
      '/database/change-password',
      { currentUsername, currentPassword, newPassword },
      { showSuccess: true }
    ),

  getTableData: (params: TableDataQuery) =>
    http.get<TableDataResult>('/database/table-data', { params }),

  insertRow: (database: string, table: string, row: Record<string, unknown>) =>
    http.post<{ success: boolean; affectedRows: number; insertId: number }>('/database/rows', {
      database,
      table,
      row
    }),

  updateRow: (
    database: string,
    table: string,
    primaryKeyValues: Record<string, unknown>,
    changes: Record<string, unknown>
  ) =>
    http.put<{ success: boolean; affectedRows: number }>('/database/rows', {
      database,
      table,
      primaryKeyValues,
      changes
    }),

  deleteRow: (database: string, table: string, primaryKeyValues: Record<string, unknown>) =>
    http.delete<{ success: boolean; affectedRows: number }>('/database/rows', {
      data: { database, table, primaryKeyValues }
    }),

  createTable: (
    database: string,
    tableName: string,
    columns: CreateTableColumn[],
    engine?: string,
    charset?: string,
    comment?: string
  ) =>
    http.post(
      '/database/tables',
      {
        database,
        tableName,
        columns,
        engine,
        charset,
        comment
      },
      { showSuccess: true }
    )
}

// ========== Chat Types ==========
export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
  timestamp?: number
}

export interface ChatConversation {
  id: string
  title: string
  messages: ChatMessage[]
  provider: string
  model: string
  createdAt: number
  updatedAt: number
}

export interface ProviderInfo {
  id: string
  label: string
  configured: boolean
  models: string[]
  defaultModel: string
}

export interface ChatStatus {
  configured: boolean
  providers: ProviderInfo[]
  activeProvider: string
  activeModel: string
}

export interface ChatStreamChunk {
  content: string
  done: boolean
  conversationId?: string
  error?: string
}

// ========== Chat API ==========
export const chatApi = {
  getStatus: () => http.get<ChatStatus>('/chat/status'),

  getProviders: () => http.get<{ providers: ProviderInfo[] }>('/chat/providers'),

  listConversations: () => http.get<{ conversations: ChatConversation[] }>('/chat/conversations'),

  getConversation: (id: string) => http.get<ChatConversation>(`/chat/conversations/${id}`),

  deleteConversation: (id: string) =>
    http.delete(`/chat/conversations/${id}`, { showSuccess: true }),

  updateTitle: (id: string, title: string) =>
    http.put(`/chat/conversations/${id}/title`, { title }),

  async sendMessage(
    message: string,
    options?: { conversationId?: string; provider?: string; model?: string },
    onChunk?: (chunk: ChatStreamChunk) => void
  ): Promise<string | undefined> {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationId: options?.conversationId,
        provider: options?.provider,
        model: options?.model
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Request failed')
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response stream')

    const decoder = new TextDecoder()
    let buffer = ''
    let resultConvId: string | undefined

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        try {
          const data: ChatStreamChunk = JSON.parse(trimmed.slice(5).trim())
          if (data.conversationId) resultConvId = data.conversationId
          onChunk?.(data)
        } catch {
          // skip
        }
      }
    }

    return resultConvId
  }
}
