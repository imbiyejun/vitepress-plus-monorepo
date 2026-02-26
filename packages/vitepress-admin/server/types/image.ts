import { Request } from 'express'
import type { DirectoryItem, Breadcrumb, PaginationInfo } from './common.js'

// Qiniu configuration types
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

// Extended Request interface for upload with custom path
export interface UploadRequest extends Request {
  body: {
    uploadPath?: string
  }
}

// Re-export common types for convenience
export type { DirectoryItem, Breadcrumb, PaginationInfo }

export interface DirectoryContents {
  items: DirectoryItem[]
  currentPath: string
  breadcrumbs: Breadcrumb[]
  pagination?: PaginationInfo
}

export interface DirectoryListResponse {
  success: boolean
  data: {
    items: DirectoryItem[]
    currentPath: string
    breadcrumbs: Breadcrumb[]
  }
  error?: string
}

export interface DirectoryListData {
  directories: DirectoryItem[]
  currentPath: string
  breadcrumbs: Breadcrumb[]
}

export interface ImageInfo {
  name: string
  path: string
  size?: number
  createTime: string
  modifyTime: string
}
