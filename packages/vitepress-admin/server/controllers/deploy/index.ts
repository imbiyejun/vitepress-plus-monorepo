import { type Request, type Response } from 'express'
import { Client as SSHClient } from 'ssh2'
import { sendSuccess, sendError } from '../../utils/response.js'
import { deployService, type DeployConfig } from '../../services/deployService.js'

export interface DeployStatus {
  configured: boolean
  host?: string
  remotePath?: string
}

function getDeployConfig(): DeployConfig | null {
  const { DEPLOY_HOST, DEPLOY_PORT, DEPLOY_USERNAME, DEPLOY_PASSWORD, DEPLOY_REMOTE_PATH } =
    process.env

  if (!DEPLOY_HOST || !DEPLOY_USERNAME || !DEPLOY_PASSWORD || !DEPLOY_REMOTE_PATH) {
    return null
  }

  return {
    host: DEPLOY_HOST,
    port: parseInt(DEPLOY_PORT || '22', 10),
    username: DEPLOY_USERNAME,
    password: DEPLOY_PASSWORD,
    remotePath: DEPLOY_REMOTE_PATH
  }
}

export const getDeployStatus = (_req: Request, res: Response): void => {
  const config = getDeployConfig()

  if (!config) {
    sendSuccess<DeployStatus>(res, { configured: false })
    return
  }

  sendSuccess<DeployStatus>(res, {
    configured: true,
    host: config.host,
    remotePath: config.remotePath
  })
}

// Start async deploy task
export const startDeploy = async (_req: Request, res: Response): Promise<void> => {
  const config = getDeployConfig()

  if (!config) {
    sendError(res, '部署配置未设置，请在 .env 文件中配置 DEPLOY_* 相关变量', 400)
    return
  }

  if (deployService.isRunning()) {
    sendError(res, '已有部署任务正在执行', 400)
    return
  }

  try {
    const taskId = await deployService.startDeploy(config)
    sendSuccess(res, { taskId }, '部署任务已启动')
  } catch (error) {
    const message = error instanceof Error ? error.message : '启动部署失败'
    sendError(res, message, 500)
  }
}

// Get current task status
export const getTaskStatus = (_req: Request, res: Response): void => {
  const task = deployService.getCurrentTask()
  sendSuccess(res, { task })
}

// Execute SSH command helper
function execCommand(client: SSHClient, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.exec(command, (err, stream) => {
      if (err) {
        reject(err)
        return
      }

      let stdout = ''
      let stderr = ''

      stream.on('close', (code: number) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(stderr || `Command exited with code ${code}`))
        }
      })

      stream.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      stream.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })
    })
  })
}

export const testConnection = async (_req: Request, res: Response): Promise<void> => {
  const config = getDeployConfig()

  if (!config) {
    sendError(res, '部署配置未设置', 400)
    return
  }

  const client = new SSHClient()

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end()
        reject(new Error('连接超时'))
      }, 10000)

      client.on('ready', () => {
        clearTimeout(timeout)
        resolve()
      })

      client.on('error', err => {
        clearTimeout(timeout)
        reject(err)
      })

      client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password
      })
    })

    // Check if unzip is available
    try {
      await execCommand(client, 'which unzip')
    } catch {
      client.end()
      sendError(res, '服务器未安装 unzip 命令，请先安装: apt-get install unzip', 400)
      return
    }

    client.end()
    sendSuccess(res, { connected: true }, '连接成功')
  } catch (error) {
    client.end()
    const message = error instanceof Error ? error.message : '未知错误'
    sendError(res, `连接失败: ${message}`, 500)
  }
}

// Re-export for WebSocket integration
export { deployService }
