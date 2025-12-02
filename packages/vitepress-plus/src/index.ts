// Main entry point for @imbiyejun/vitepress-plus

// Export configuration functions and types
export {
  defineConfig,
  loadConfig,
  resolvePath,
  getTopicsConfigPath,
  getTopicsDataPath,
  validateConfig,
  defaultConfig
} from './config/index.js'

export type {
  VitePressConfig,
  VitePlusPlusConfig,
  PathsConfig,
  TopicsConfig,
  ArticleStatusConfig,
  ComponentsConfig,
  ThemeConfig
} from './config/types.js'

// Export utils
export * from './utils/index.js'
