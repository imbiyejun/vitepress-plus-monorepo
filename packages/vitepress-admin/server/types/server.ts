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

// Server environment initialization types
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

export interface CommandResult {
  success: boolean
  output: string
  exitCode: number
}

// Software management types

export type SoftwareCategory = 'webserver' | 'runtime' | 'database' | 'tool'

export interface SoftwareDefinition {
  id: string
  name: string
  description: string
  icon: string
  color: string
  category: SoftwareCategory
  checkCmd: string
  versionCmd: string
  installSteps: Array<{ title: string; cmd: string; timeout?: number }>
  uninstallSteps: Array<{ title: string; cmd: string; timeout?: number }>
  upgradeSteps: Array<{ title: string; cmd: string; timeout?: number }>
  configPaths: string[]
  serviceName?: string
}

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
