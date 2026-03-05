// Server management types for SSH-based file operations and terminal

export interface ServerConfig {
  host: string
  port: number
  username: string
  password: string
}

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

export interface ServerDirectoryContents {
  items: ServerFileInfo[]
  currentPath: string
  breadcrumbs: ServerBreadcrumb[]
}

export interface ServerBreadcrumb {
  name: string
  path: string
}

export interface FileOperationResult {
  success: boolean
  message?: string
}

export interface FileContentResult {
  content: string
  path: string
  size: number
  encoding: string
}

// Terminal session management
export interface TerminalSession {
  id: string
  connected: boolean
  createdAt: number
}

// WebSocket message types for terminal
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

// Upload progress tracking
export interface UploadProgress {
  filename: string
  uploaded: number
  total: number
  percentage: number
}

export interface UploadResult {
  success: boolean
  filename: string
  remotePath: string
  size: number
  message?: string
}

export interface DownloadResult {
  success: boolean
  filename: string
  localPath: string
  size: number
}
