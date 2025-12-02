export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  details?: unknown
}

export interface PaginationInfo {
  current: number
  pageSize: number
  total?: number
  hasMore?: boolean
  hasPrevious?: boolean
  nextMarker?: string | null
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
