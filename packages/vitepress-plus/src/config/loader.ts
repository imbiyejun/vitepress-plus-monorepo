// Configuration loader for VitePress Plus
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { VitePressConfig, VitePlusPlusConfig } from './types.js'
import { defaultConfig } from './defaults.js'

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  
  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = result[key]
    
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      // Use type assertion to handle complex type inference
      result[key] = deepMerge(
        (targetValue || {}) as Record<string, any>,
        sourceValue as Record<string, any>
      ) as any
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as any
    }
  }
  
  return result
}

/**
 * Convert Windows path to file URL
 */
function pathToFileURL(path: string): string {
  if (process.platform === 'win32') {
    // Convert Windows path to file:// URL
    return 'file:///' + path.replace(/\\/g, '/')
  }
  return path
}

/**
 * Load configuration from file system
 */
export async function loadConfig(searchFrom?: string): Promise<VitePressConfig> {
  const cwd = searchFrom || process.cwd()
  
  // Try to find config file
  const configFiles = [
    'vitepress-plus.config.js',
    'vitepress-plus.config.ts',
    'vitepress-plus.config.mjs',
    '.vitepressrc.js',
    '.vitepressrc.ts'
  ]
  
  let userConfig: VitePressConfig = {}
  
  for (const file of configFiles) {
    const configPath = resolve(cwd, file)
    if (existsSync(configPath)) {
      try {
        // Convert to file URL for Windows compatibility
        const fileURL = pathToFileURL(configPath)
        const config = await import(fileURL)
        userConfig = config.default || config
        break
      } catch (error) {
        console.warn(`Failed to load config from ${file}:`, error)
      }
    }
  }
  
  // Merge with default config
  const vitepressPlus = deepMerge(
    defaultConfig,
    userConfig.vitepressPlus || {}
  )
  
  return {
    vitepressPlus,
    vitepress: userConfig.vitepress || {}
  }
}

/**
 * Resolve path relative to project root
 */
export function resolvePath(basePath: string, relativePath: string): string {
  return resolve(basePath, relativePath)
}

/**
 * Get topics config path
 */
export function getTopicsConfigPath(config: VitePlusPlusConfig, basePath: string): string {
  const topicsDir = config.paths?.topics || './docs/.vitepress/topics'
  const dataPath = config.topics?.dataPath || 'config/index.ts'
  return resolve(basePath, topicsDir, dataPath)
}

/**
 * Get topics data path
 */
export function getTopicsDataPath(config: VitePlusPlusConfig, basePath: string): string {
  const topicsDir = config.paths?.topics || './docs/.vitepress/topics'
  return resolve(basePath, topicsDir, 'data/index.ts')
}

/**
 * Validate configuration
 */
export function validateConfig(config: VitePlusPlusConfig): boolean {
  // Basic validation
  if (!config.paths) {
    console.warn('VitePress Plus: paths configuration is missing')
    return false
  }
  
  return true
}

