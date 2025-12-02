import { loadImageConfigFromEnv } from '../../../config/imageConfig'
import type { ImageConfig } from '../../../types/image'

// Load Qiniu configuration from environment variables
export const loadQiniuConfig = async (): Promise<ImageConfig | null> => {
  try {
    return loadImageConfigFromEnv()
  } catch {
    return null
  }
}
