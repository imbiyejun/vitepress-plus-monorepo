import type { ImageConfig, QiniuConfig, LocalConfig } from '../types/image'

// Load image configuration from environment variables
export const loadImageConfigFromEnv = (): ImageConfig => {
  const localStorage: LocalConfig = {
    path: process.env.LOCAL_STORAGE_PATH || 'public/images'
  }

  const qiniuStorage: QiniuConfig = {
    accessKey: process.env.QINIU_ACCESS_KEY || '',
    secretKey: process.env.QINIU_SECRET_KEY || '',
    bucket: process.env.QINIU_BUCKET || '',
    domain: process.env.QINIU_DOMAIN || '',
    region: (process.env.QINIU_REGION || 'z0') as 'z0' | 'z1' | 'z2' | 'na0' | 'as0',
    urlSuffix: process.env.QINIU_URL_SUFFIX || '',
    path: process.env.QINIU_PATH || ''
  }

  return {
    localStorage,
    qiniuStorage
  }
}

// Validate Qiniu configuration
export const validateQiniuConfig = (config: QiniuConfig): boolean => {
  return !!(config.accessKey && config.secretKey && config.bucket && config.domain && config.region)
}
