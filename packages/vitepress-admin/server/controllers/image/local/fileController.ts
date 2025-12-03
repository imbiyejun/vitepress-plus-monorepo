import path from 'path'
import fs from 'fs/promises'
import { Request, Response } from 'express'
import { sendSuccess, sendError } from '../../../utils/response'
import { getProjectRoot, getPublicPath } from '../../../utils/imageUtils.js'

// Type definitions
interface ImageFile {
  path: string
  name: string
  createTime: string
  modifyTime: string
}

// Helper function to extract relative path from URL or path string
const getRelativePath = (imagePath: string): string => {
  try {
    // Try parsing as URL first (e.g., http://localhost:3000/images/xxx.jpg)
    const urlPath = new URL(imagePath).pathname
    return urlPath.replace(/^\/images\//, '').replace(/^\//, '')
  } catch {
    // If not a valid URL, treat as relative path (e.g., /images/xxx.jpg or /xxx.jpg)
    return imagePath.replace(/^\/images\//, '').replace(/^\//, '')
  }
}

// Get all images from public directory
export const getAllImages = async (req: Request, res: Response) => {
  try {
    const { search } = req.query
    const publicPath = getPublicPath()
    const publicImagesPath = path.join(publicPath, 'images')

    // Recursively get all image files
    async function getImagesRecursively(dir: string): Promise<ImageFile[]> {
      const items = await fs.readdir(dir, { withFileTypes: true })
      const files: ImageFile[] = []

      for (const item of items) {
        const fullPath = path.join(dir, item.name)
        if (item.isDirectory()) {
          files.push(...(await getImagesRecursively(fullPath)))
        } else {
          const ext = path.extname(item.name).toLowerCase()
          if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            const stats = await fs.stat(fullPath)
            const relativePath = path.relative(publicImagesPath, fullPath)
            files.push({
              path: relativePath,
              name: item.name,
              createTime: stats.birthtime.toISOString(),
              modifyTime: stats.mtime.toISOString()
            })
          }
        }
      }
      return files
    }

    let images = await getImagesRecursively(publicImagesPath)

    // Filter images if search keyword provided
    if (search) {
      const searchLower = search.toString().toLowerCase()
      images = images.filter(
        img =>
          img.name.toLowerCase().includes(searchLower) ||
          path.dirname(img.path).toLowerCase().includes(searchLower)
      )
    }

    sendSuccess(
      res,
      images.map(img => {
        const normalizedPath = img.path.replace(/\\/g, '/')
        return {
          path: `/images/${normalizedPath}`,
          name: path.basename(img.path),
          createTime: img.createTime,
          modifyTime: img.modifyTime
        }
      })
    )
  } catch (error) {
    console.error('Error getting images:', error)
    sendError(res, '获取图片列表失败', 500, error instanceof Error ? error.message : String(error))
  }
}

// Delete image
export const deleteImage = async (req: Request, res: Response) => {
  try {
    const { imagePath } = req.body
    if (!imagePath) {
      return sendError(res, '缺少图片路径参数', 400)
    }

    const publicPath = getPublicPath()
    const relativePath = getRelativePath(imagePath)
    // All files are under public/
    const fullPath = path.join(publicPath, relativePath)

    // Check if file exists
    try {
      await fs.access(fullPath)
    } catch {
      return sendError(res, '图片不存在', 404)
    }

    // Delete file
    await fs.unlink(fullPath)

    sendSuccess(res, null, '图片删除成功')
  } catch (error) {
    console.error('Error deleting image:', error)
    sendError(res, '删除图片失败', 500, error instanceof Error ? error.message : String(error))
  }
}

// Rename image
export const renameImage = async (req: Request, res: Response) => {
  try {
    const { imagePath, newName } = req.body
    if (!imagePath || !newName) {
      return sendError(res, '缺少必要参数', 400)
    }

    const publicPath = getPublicPath()
    const relativePath = getRelativePath(imagePath)
    // All files are under public/
    const fullPath = path.join(publicPath, relativePath)
    const dirPath = path.dirname(fullPath)

    // Check if file exists
    try {
      await fs.access(fullPath)
    } catch {
      return sendError(res, '图片不存在', 404)
    }

    // Get file extension
    const ext = path.extname(fullPath)
    const newFullPath = path.join(dirPath, newName + ext)

    // Check if new filename already exists
    try {
      await fs.access(newFullPath)
      return sendError(res, '文件名已存在', 400)
    } catch {
      // File doesn't exist, can proceed with rename
    }

    // Rename file
    await fs.rename(fullPath, newFullPath)

    // Get new file info
    const stats = await fs.stat(newFullPath)
    const newRelativePath = path
      .relative(getPublicPath(), newFullPath)
      .replace(/\\/g, '/')

    sendSuccess(res, {
      path: `/${newRelativePath}`,
      name: path.basename(newFullPath),
      createTime: stats.birthtime.toISOString(),
      modifyTime: stats.mtime.toISOString()
    })
  } catch (error) {
    console.error('Error renaming image:', error)
    sendError(res, '重命名图片失败', 500, error instanceof Error ? error.message : String(error))
  }
}

// Check if image name exists
export const checkImageName = async (req: Request, res: Response) => {
  try {
    const { imagePath, newName } = req.body
    if (!imagePath || !newName) {
      return sendError(res, '缺少必要参数', 400)
    }

    const publicPath = getPublicPath()
    const relativePath = getRelativePath(imagePath)
    // All files are under public/
    const fullPath = path.join(publicPath, relativePath)
    const dirPath = path.dirname(fullPath)
    const ext = path.extname(fullPath)
    const newFullPath = path.join(dirPath, newName + ext)

    // Check if new filename already exists
    try {
      await fs.access(newFullPath)
      return sendError(res, '文件名已存在', 400)
    } catch {
      // File doesn't exist, can use
      return sendSuccess(res, { available: true })
    }
  } catch (error) {
    console.error('检查文件名失败:', error)
    sendError(res, '检查文件名失败', 500, error instanceof Error ? error.message : String(error))
  }
}
