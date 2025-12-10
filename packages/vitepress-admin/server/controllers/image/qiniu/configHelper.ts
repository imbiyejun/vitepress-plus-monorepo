import { loadImageConfigFromEnv } from '../../../config/imageConfig.js'
import type { ImageConfig } from '../../../types/image.js'

// Load Qiniu configuration from environment variables
export const loadQiniuConfig = async (): Promise<ImageConfig | null> => {
  try {
    return loadImageConfigFromEnv()
  } catch {
    return null
  }
}
