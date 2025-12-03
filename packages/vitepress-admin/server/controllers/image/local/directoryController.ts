import path from 'path'
import fs from 'fs/promises'
import { Request, Response } from 'express'
import { sendSuccess, sendError } from '../../../utils/response'
import { getPublicPath } from '../../../utils/imageUtils.js'
import type { DirectoryItem, Breadcrumb } from '../../../types/image'

// Get directory contents with files and folders, with search support
export const getDirectoryContents = async (req: Request, res: Response) => {
  try {
    const { dirPath = '', search = '' } = req.query
    const publicPath = getPublicPath()

    // Sanitize directory path to prevent directory traversal
    let safeDirPath = ''
    if (dirPath && typeof dirPath === 'string') {
      safeDirPath = path.normalize(dirPath).replace(/^(\.\.[/\\])+/, '')
    }

    const searchKeyword = (search as string) || ''
    const targetPath = path.join(publicPath, safeDirPath)

    // Ensure target path is within public directory
    if (!targetPath.startsWith(publicPath)) {
      return sendError(res, 'Invalid directory path', 400)
    }

    // Check if directory exists
    try {
      const stats = await fs.stat(targetPath)
      if (!stats.isDirectory()) {
        return sendError(res, 'Path is not a directory', 400)
      }
    } catch {
      return sendError(res, 'Directory not found', 404)
    }

    // Read directory contents with search support
    let directoryItems: DirectoryItem[] = []

    if (searchKeyword) {
      // When searching, recursively search all subdirectories
      const searchRecursively = async (
        searchPath: string,
        basePath: string
      ): Promise<DirectoryItem[]> => {
        const items: DirectoryItem[] = []
        const dirItems = await fs.readdir(searchPath, { withFileTypes: true })

        for (const item of dirItems) {
          const itemPath = path.join(searchPath, item.name)
          const stats = await fs.stat(itemPath)

          if (item.isDirectory()) {
            const subItems = await searchRecursively(itemPath, basePath)
            items.push(...subItems)
          } else if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase()
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
              const relativePath = path.relative(basePath, itemPath).replace(/\\/g, '/')
              const searchLower = searchKeyword.toLowerCase()
              const fileNameLower = item.name.toLowerCase()
              const relativePathLower = relativePath.toLowerCase()

              if (fileNameLower.includes(searchLower) || relativePathLower.includes(searchLower)) {
                items.push({
                  name: item.name,
                  type: 'file',
                  path: `/${relativePath}`,
                  createTime: stats.birthtime.toISOString(),
                  modifyTime: stats.mtime.toISOString(),
                  size: stats.size
                })
              }
            }
          }
        }
        return items
      }

      directoryItems = await searchRecursively(targetPath, publicPath)
    } else {
      // Normal directory listing (no search)
      const items = await fs.readdir(targetPath, { withFileTypes: true })

      for (const item of items) {
        const itemPath = path.join(targetPath, item.name)
        const stats = await fs.stat(itemPath)
        const relativePath = path.relative(publicPath, itemPath).replace(/\\/g, '/')

        if (item.isDirectory()) {
          directoryItems.push({
            name: item.name,
            type: 'directory',
            path: relativePath,
            createTime: stats.birthtime.toISOString(),
            modifyTime: stats.mtime.toISOString()
          })
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase()
          if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
            directoryItems.push({
              name: item.name,
              type: 'file',
              path: `/${relativePath}`,
              createTime: stats.birthtime.toISOString(),
              modifyTime: stats.mtime.toISOString(),
              size: stats.size
            })
          }
        }
      }
    }

    // Sort items
    directoryItems.sort((a, b) => {
      if (!searchKeyword && a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    // Generate breadcrumbs
    const breadcrumbs: Breadcrumb[] = [{ name: 'public', path: '' }]

    if (safeDirPath) {
      const pathParts = safeDirPath.split(/[/\\]/).filter(Boolean)
      let currentPath = ''

      for (const part of pathParts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        breadcrumbs.push({
          name: part,
          path: currentPath
        })
      }
    }

    sendSuccess(res, {
      items: directoryItems,
      currentPath: safeDirPath,
      breadcrumbs
    })
  } catch (error) {
    console.error('Error getting directory contents:', error)
    sendError(
      res,
      'Failed to get directory contents',
      500,
      error instanceof Error ? error.message : String(error)
    )
  }
}

// Create directory
export const createDirectory = async (req: Request, res: Response) => {
  try {
    const { dirPath, directoryName } = req.body
    if (!directoryName) {
      return sendError(res, '缺少目录名称参数', 400)
    }

    // Sanitize directory name
    if (
      directoryName.includes('..') ||
      directoryName.includes('/') ||
      directoryName.includes('\\')
    ) {
      return sendError(res, '无效的目录名称', 400)
    }

    const publicPath = getPublicPath()

    // Sanitize parent directory path
    let safeDirPath = ''
    if (dirPath && typeof dirPath === 'string') {
      safeDirPath = path.normalize(dirPath).replace(/^(\.\.[/\\])+/, '')
    }

    const newDirPath = path.join(publicPath, safeDirPath, directoryName)

    // Ensure target path is within public directory
    if (!newDirPath.startsWith(publicPath)) {
      return sendError(res, 'Invalid directory path', 400)
    }

    // Check if directory already exists
    try {
      await fs.access(newDirPath)
      return sendError(res, '目录已存在', 400)
    } catch {
      // Directory doesn't exist, can create
    }

    // Create directory
    await fs.mkdir(newDirPath, { recursive: true })

    sendSuccess(res, null, '目录创建成功')
  } catch (error) {
    console.error('Error creating directory:', error)
    sendError(res, '创建目录失败', 500, error instanceof Error ? error.message : String(error))
  }
}

// Delete directory
export const deleteDirectory = async (req: Request, res: Response) => {
  try {
    const { directoryPath } = req.body
    if (!directoryPath) {
      return sendError(res, '缺少目录路径参数', 400)
    }

    const publicPath = getPublicPath()

    // Sanitize directory path
    const safeDirPath = path.normalize(directoryPath).replace(/^(\.\.[/\\])+/, '')
    const fullDirPath = path.join(publicPath, safeDirPath)

    // Ensure target path is within public directory
    if (!fullDirPath.startsWith(publicPath)) {
      return sendError(res, 'Invalid directory path', 400)
    }

    // Prevent deleting public directory itself
    if (fullDirPath === publicPath) {
      return sendError(res, '不能删除public目录', 400)
    }

    // Check if directory exists
    try {
      const stats = await fs.stat(fullDirPath)
      if (!stats.isDirectory()) {
        return sendError(res, '路径不是目录', 400)
      }
    } catch {
      return sendError(res, '目录不存在', 404)
    }

    // Delete directory recursively
    await fs.rm(fullDirPath, { recursive: true, force: true })

    sendSuccess(res, null, '目录删除成功')
  } catch (error) {
    console.error('Error deleting directory:', error)
    sendError(res, '删除目录失败', 500, error instanceof Error ? error.message : String(error))
  }
}

// Get local directories for upload path selection
export const getLocalDirectories = async (req: Request, res: Response) => {
  try {
    const { prefix = '' } = req.query
    const publicPath = getPublicPath()

    // Sanitize prefix
    let safePrefix = ''
    if (prefix && typeof prefix === 'string') {
      safePrefix = path.normalize(prefix).replace(/^(\.\.[/\\])+/, '')
    }

    const targetPath = path.join(publicPath, safePrefix)

    // Ensure target path is within public directory
    if (!targetPath.startsWith(publicPath)) {
      return sendError(res, 'Invalid directory path', 400)
    }

    // Check if directory exists
    try {
      const stats = await fs.stat(targetPath)
      if (!stats.isDirectory()) {
        return sendError(res, 'Path is not a directory', 400)
      }
    } catch {
      return sendError(res, 'Directory not found', 404)
    }

    // Read directory contents
    const items = await fs.readdir(targetPath, { withFileTypes: true })
    const directories: DirectoryItem[] = []

    for (const item of items) {
      if (item.isDirectory()) {
        const itemPath = path.join(targetPath, item.name)
        const stats = await fs.stat(itemPath)
        const relativePath = path.relative(publicPath, itemPath).replace(/\\/g, '/')

        directories.push({
          name: item.name,
          type: 'directory',
          path: relativePath,
          createTime: stats.birthtime.toISOString(),
          modifyTime: stats.mtime.toISOString()
        })
      }
    }

    // Sort directories by name
    directories.sort((a, b) => a.name.localeCompare(b.name))

    // Generate breadcrumbs
    const breadcrumbs: Breadcrumb[] = [{ name: 'public', path: '' }]

    if (safePrefix) {
      const pathParts = safePrefix.split(/[/\\]/).filter(Boolean)
      let currentPath = ''

      for (const part of pathParts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        breadcrumbs.push({
          name: part,
          path: currentPath
        })
      }
    }

    sendSuccess(res, {
      directories,
      currentPath: safePrefix,
      breadcrumbs
    })
  } catch (error) {
    console.error('Error getting local directories:', error)
    sendError(res, '获取目录列表失败', 500, error instanceof Error ? error.message : String(error))
  }
}
