// Config module exports
export { loadConfig, resolvePath, getTopicsConfigPath, getTopicsDataPath, validateConfig } from './loader.js'
export { defaultConfig } from './defaults.js'
export type {
  VitePressConfig,
  VitePlusPlusConfig,
  PathsConfig,
  TopicsConfig,
  ArticleStatusConfig,
  ComponentsConfig,
  ThemeConfig
} from './types.js'

// Helper function for defining config
import type { VitePressConfig } from './types.js'

export function defineConfig(config: VitePressConfig): VitePressConfig {
  return config
}
