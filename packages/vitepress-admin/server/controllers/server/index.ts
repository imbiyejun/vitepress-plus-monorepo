import { type Request, type Response } from 'express'
import { sendSuccess, sendError } from '../../utils/response.js'
import { serverService } from '../../services/serverService.js'
import type {
  ServerStatus,
  ServerDirectoryContents,
  FileContentResult
} from '../../types/server.js'
import fs from 'fs'
import path from 'path'

// Get server connection status
export const getServerStatus = (_req: Request, res: Response): void => {
  const config = serverService.getServerConfig()

  if (!config) {
    sendSuccess<ServerStatus>(res, { configured: false })
    return
  }

  sendSuccess<ServerStatus>(res, {
    configured: true,
    host: config.host,
    username: config.username
  })
}

// Test server connection
export const testConnection = async (_req: Request, res: Response): Promise<void> => {
  const config = serverService.getServerConfig()

  if (!config) {
    sendError(res, '服务器配置未设置', 400)
    return
  }

  try {
    // Try to list root directory to test connection
    await serverService.listDirectory('/')
    sendSuccess(res, { connected: true }, '连接成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    sendError(res, `连接失败: ${message}`, 500)
  }
}

// List directory contents
export const listDirectory = async (req: Request, res: Response): Promise<void> => {
  try {
    const dirPath = (req.query.path as string) || '/'
    const contents = await serverService.listDirectory(dirPath)
    sendSuccess<ServerDirectoryContents>(res, contents)
  } catch (error) {
    const message = error instanceof Error ? error.message : '读取目录失败'
    sendError(res, message, 500)
  }
}

// Read file content
export const readFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const filePath = req.query.path as string
    if (!filePath) {
      sendError(res, '文件路径不能为空', 400)
      return
    }

    const maxSize = parseInt(req.query.maxSize as string) || 5 * 1024 * 1024
    const result = await serverService.readFile(filePath, maxSize)
    sendSuccess<FileContentResult>(res, result)
  } catch (error) {
    const message = error instanceof Error ? error.message : '读取文件失败'
    sendError(res, message, 500)
  }
}

// Write file content
export const writeFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { path: filePath, content } = req.body
    if (!filePath) {
      sendError(res, '文件路径不能为空', 400)
      return
    }

    await serverService.writeFile(filePath, content || '')
    sendSuccess(res, null, '文件保存成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存文件失败'
    sendError(res, message, 500)
  }
}

// Create directory
export const createDirectory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { path: dirPath } = req.body
    if (!dirPath) {
      sendError(res, '目录路径不能为空', 400)
      return
    }

    await serverService.createDirectory(dirPath)
    sendSuccess(res, null, '目录创建成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建目录失败'
    sendError(res, message, 500)
  }
}

// Delete file
export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { path: filePath } = req.body
    if (!filePath) {
      sendError(res, '文件路径不能为空', 400)
      return
    }

    await serverService.deleteFile(filePath)
    sendSuccess(res, null, '文件删除成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除文件失败'
    sendError(res, message, 500)
  }
}

// Delete directory
export const deleteDirectory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { path: dirPath, recursive } = req.body
    if (!dirPath) {
      sendError(res, '目录路径不能为空', 400)
      return
    }

    if (recursive) {
      await serverService.deleteDirectoryRecursive(dirPath)
    } else {
      await serverService.deleteDirectory(dirPath)
    }
    sendSuccess(res, null, '目录删除成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除目录失败'
    sendError(res, message, 500)
  }
}

// Rename file or directory
export const rename = async (req: Request, res: Response): Promise<void> => {
  try {
    const { oldPath, newPath } = req.body
    if (!oldPath || !newPath) {
      sendError(res, '路径不能为空', 400)
      return
    }

    await serverService.rename(oldPath, newPath)
    sendSuccess(res, null, '重命名成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '重命名失败'
    sendError(res, message, 500)
  }
}

// Upload file to server
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file
    const remotePath = req.body.remotePath as string

    if (!file) {
      sendError(res, '没有上传文件', 400)
      return
    }

    if (!remotePath) {
      sendError(res, '远程路径不能为空', 400)
      return
    }

    const remoteFilePath = path.posix.join(remotePath, file.originalname)
    await serverService.uploadFile(file.path, remoteFilePath)

    // Clean up temp file
    fs.unlinkSync(file.path)

    sendSuccess(
      res,
      {
        success: true,
        filename: file.originalname,
        remotePath: remoteFilePath,
        size: file.size
      },
      '文件上传成功'
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : '上传文件失败'
    sendError(res, message, 500)
  }
}

// Download file from server
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const remotePath = req.query.path as string
    if (!remotePath) {
      sendError(res, '文件路径不能为空', 400)
      return
    }

    const filename = path.basename(remotePath)
    const { stream, size } = await serverService.getFileStream(remotePath)

    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('Content-Length', size)

    stream.pipe(res)

    stream.on('error', err => {
      console.error('Download stream error:', err)
      if (!res.headersSent) {
        sendError(res, '下载文件失败', 500)
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '下载文件失败'
    sendError(res, message, 500)
  }
}

// Upload multiple files
export const uploadFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[]
    const remotePath = req.body.remotePath as string

    if (!files || files.length === 0) {
      sendError(res, '没有上传文件', 400)
      return
    }

    if (!remotePath) {
      sendError(res, '远程路径不能为空', 400)
      return
    }

    const results = []

    for (const file of files) {
      const remoteFilePath = path.posix.join(remotePath, file.originalname)
      try {
        await serverService.uploadFile(file.path, remoteFilePath)
        results.push({
          success: true,
          filename: file.originalname,
          remotePath: remoteFilePath,
          size: file.size
        })
      } catch (err) {
        results.push({
          success: false,
          filename: file.originalname,
          message: err instanceof Error ? err.message : '上传失败'
        })
      }
      // Clean up temp file
      fs.unlinkSync(file.path)
    }

    sendSuccess(res, results, '上传完成')
  } catch (error) {
    const message = error instanceof Error ? error.message : '上传文件失败'
    sendError(res, message, 500)
  }
}

// Re-export service for WebSocket integration
export { serverService }
