import { type Request, type Response } from 'express'
import { sendSuccess, sendError } from '../../utils/response.js'
import { serverInitService } from '../../services/serverInitService.js'
import { serverService } from '../../services/serverService.js'
import type { ServerInitConfig, ServerEnvStatus, InitTask } from '../../types/server.js'

// Get current environment status
export const getEnvStatus = async (_req: Request, res: Response): Promise<void> => {
  const config = serverService.getServerConfig()

  if (!config) {
    sendError(res, '服务器配置未设置', 400)
    return
  }

  try {
    const status = await serverInitService.checkEnvironment()
    sendSuccess<ServerEnvStatus>(res, status)
  } catch (error) {
    const message = error instanceof Error ? error.message : '检查环境失败'
    sendError(res, message, 500)
  }
}

// Start environment initialization
export const startInit = async (req: Request, res: Response): Promise<void> => {
  const config = serverService.getServerConfig()

  if (!config) {
    sendError(res, '服务器配置未设置', 400)
    return
  }

  try {
    const initConfig: ServerInitConfig = req.body || {}
    const taskId = await serverInitService.startInit(initConfig)
    sendSuccess(res, { taskId }, '初始化任务已启动')
  } catch (error) {
    const message = error instanceof Error ? error.message : '启动初始化失败'
    sendError(res, message, 500)
  }
}

// Get current init task status
export const getInitTask = (_req: Request, res: Response): void => {
  const task = serverInitService.getCurrentTask()
  sendSuccess<{ task: InitTask | null }>(res, { task })
}
