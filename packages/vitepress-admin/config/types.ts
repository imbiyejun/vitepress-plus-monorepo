// Configuration types for VitePress Admin

export interface ServerConfig {
  port: number
  host: string
}

export interface ProjectConfig {
  root: string
  docsDir: string
  articlesDir: string
  topicsConfigDir: string
  topicsDataDir: string
  publicDir: string
  imagesDir: string
}

export interface ImageConfig {
  localStorage: {
    enabled: boolean
    path: string
    maxSize: number
    allowedTypes: string[]
  }
  qiniuStorage?: {
    enabled: boolean
    accessKey: string
    secretKey: string
    bucket: string
    domain: string
    region: string
  }
}

export interface WatchConfig {
  enabled: boolean
  debounce: number
  ignored: string[]
}

export interface VPAConfig {
  server: ServerConfig
  project: ProjectConfig
  image: ImageConfig
  watch: WatchConfig
}

