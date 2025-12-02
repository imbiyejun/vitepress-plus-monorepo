// Configuration loader for VitePress Admin
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import type { VPAConfig } from './types.js'
import { defaultConfig } from './default.config.js'

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  
  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = result[key]
    
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
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
    return 'file:///' + path.replace(/\\/g, '/')
  }
  return path
}

/**
 * Apply environment variables to config
 */
function applyEnvVariables(config: VPAConfig): VPAConfig {
  const result = { ...config }
  
  // Server config
  if (process.env.VPA_PORT) {
    result.server.port = parseInt(process.env.VPA_PORT)
  }
  if (process.env.VPA_HOST) {
    result.server.host = process.env.VPA_HOST
  }
  
  // Image config
  if (process.env.VPA_LOCAL_STORAGE_PATH) {
    result.image.localStorage.path = process.env.VPA_LOCAL_STORAGE_PATH
  }
  
  // Qiniu config
  if (process.env.VPA_QINIU_ACCESS_KEY) {
    if (!result.image.qiniuStorage) {
      result.image.qiniuStorage = {
        enabled: false,
        accessKey: '',
        secretKey: '',
        bucket: '',
        domain: '',
        region: 'z0'
      }
    }
    result.image.qiniuStorage.accessKey = process.env.VPA_QINIU_ACCESS_KEY
  }
  if (process.env.VPA_QINIU_SECRET_KEY && result.image.qiniuStorage) {
    result.image.qiniuStorage.secretKey = process.env.VPA_QINIU_SECRET_KEY
  }
  if (process.env.VPA_QINIU_BUCKET && result.image.qiniuStorage) {
    result.image.qiniuStorage.bucket = process.env.VPA_QINIU_BUCKET
  }
  if (process.env.VPA_QINIU_DOMAIN && result.image.qiniuStorage) {
    result.image.qiniuStorage.domain = process.env.VPA_QINIU_DOMAIN
  }
  
  return result
}

/**
 * Load configuration from file system
 */
export async function loadConfig(searchFrom?: string): Promise<VPAConfig> {
  const cwd = searchFrom || process.cwd()
  
  // Load .env file
  const envPath = resolve(cwd, '.env')
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath })
  }
  
  // Try to find config file
  const configFiles = [
    'vpa.config.js',
    'vpa.config.ts',
    'vpa.config.mjs',
    '.vparc.js',
    '.vparc.ts'
  ]
  
  let userConfig: Partial<VPAConfig> = {}
  
  for (const file of configFiles) {
    const configPath = resolve(cwd, file)
    if (existsSync(configPath)) {
      try {
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
  let config = deepMerge(defaultConfig, userConfig)
  
  // Apply environment variables
  config = applyEnvVariables(config)
  
  return config
}

/**
 * Validate configuration
 */
export function validateConfig(config: VPAConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Validate server config
  if (!config.server.port || config.server.port < 1 || config.server.port > 65535) {
    errors.push('Invalid server port')
  }
  
  // Validate project paths
  if (!config.project.root) {
    errors.push('Project root is required')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

