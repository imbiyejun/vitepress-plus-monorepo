// Configuration types for VitePress Plus
import type { UserConfig as VitePressUserConfig } from 'vitepress'

export interface PathsConfig {
  docs?: string
  articles?: string
  topics?: string
  public?: string
  images?: string
}

export interface TopicsNavConfig {
  position?: 'before' | 'after' | 'replace'
  text?: string
  showListLink?: boolean
  grouped?: boolean
}

export interface TopicsSidebarConfig {
  collapsible?: boolean
  collapsed?: boolean
}

export interface TopicsConfig {
  enabled?: boolean
  dataPath?: string
  typesPath?: string
  autoGenerateNav?: boolean
  autoGenerateSidebar?: boolean
  nav?: TopicsNavConfig
  sidebar?: TopicsSidebarConfig
}

export interface ArticleStatusType {
  label: string
  show: boolean
  color?: string
}

export interface ArticleStatusConfig {
  enabled?: boolean
  showInSidebar?: boolean
  showInPage?: boolean
  statusTypes?: Record<string, ArticleStatusType>
}

export interface ComponentsConfig {
  enabled?: boolean
  list?: string[]
  customDir?: string
}

export interface ThemeConfig {
  useDefaultExtension?: boolean
  customCss?: string
  customLayout?: string
}

export interface VitePlusPlusConfig {
  paths?: PathsConfig
  topics?: TopicsConfig
  articleStatus?: ArticleStatusConfig
  components?: ComponentsConfig
  theme?: ThemeConfig
}

export interface VitePressConfig {
  vitepressPlus?: VitePlusPlusConfig
  vitepress?: VitePressUserConfig
}

