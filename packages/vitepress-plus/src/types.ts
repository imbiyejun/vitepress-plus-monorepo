// Type definitions for VitePress Plus

import type { UserConfig as VitePressUserConfig } from 'vitepress'

export interface PathsConfig {
  docs?: string
  articles?: string
  topics?: string
  public?: string
  images?: string
}

export interface TopicsConfig {
  enabled?: boolean
  dataPath?: string
  typesPath?: string
  autoGenerateNav?: boolean
  autoGenerateSidebar?: boolean
}

export interface ArticleStatusConfig {
  enabled?: boolean
  showInSidebar?: boolean
  showInPage?: boolean
  statusTypes?: Record<string, {
    label: string
    show: boolean
    color?: string
  }>
}

export interface VitePlusPlusConfig {
  paths?: PathsConfig
  topics?: TopicsConfig
  articleStatus?: ArticleStatusConfig
}

export interface VitePressConfig {
  vitepressPlus?: VitePlusPlusConfig
  vitepress?: VitePressUserConfig
}

