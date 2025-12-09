import { Request, Response } from 'express'
import { sendSuccess, sendError } from '../../../utils/response'
import { loadImageConfigFromEnv } from '../../../config/imageConfig'

// Get image configuration from environment variables
export const getImageConfig = async (_req: Request, res: Response) => {
  try {
    const config = loadImageConfigFromEnv()
    sendSuccess(res, config)
  } catch (error) {
    console.error('Error getting image config:', error)
    sendError(res, '获取配置失败', 500, error instanceof Error ? error.message : String(error))
  }
}
