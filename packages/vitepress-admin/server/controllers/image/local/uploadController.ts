import path from 'path'
import fs from 'fs/promises'
import { Request, Response } from 'express'
import multer from 'multer'
import busboy from 'busboy'
import { sendSuccess, sendError } from '../../../utils/response'
import { getPublicPath } from '../../../utils/imageUtils.js'
import type { UploadRequest } from '../../../types/image'

// Create dynamic multer storage based on request
export const createStorage = (uploadPath: string = '') => {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      const publicPath = getPublicPath()
      let customPath = uploadPath

      // Prevent directory traversal attacks
      if (customPath && (customPath.includes('..') || customPath.includes('~'))) {
        customPath = ''
      }

      const uploadDir = path.join(publicPath, customPath)

      // Ensure directory exists
      try {
        await fs.access(uploadDir)
      } catch {
        await fs.mkdir(uploadDir, { recursive: true })
      }

      cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
      // Get original filename (without extension) and extension
      const ext = path.extname(file.originalname)
      const nameWithoutExt = path.basename(file.originalname, ext)

      // Generate timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace(/[TZ]/g, '-')

      // Final filename: original-name-timestamp+extension
      const finalName = `${nameWithoutExt}-${timestamp}${ext}`.toLowerCase().replace(/\s+/g, '-')

      cb(null, finalName)
    }
  })
}

// File filter
export const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件类型。只允许上传 JPG, PNG, GIF, WebP 格式的图片。'))
  }
}

// Error handling middleware
export const handleMulterError = (
  err: Error | multer.MulterError,
  _req: Request,
  res: Response,
  next: (err?: Error) => void
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, '文件太大，无法上传', 413, '请尝试压缩图片或使用更小的图片')
    }
  }
  next(err)
}

// Default upload instance for backward compatibility
export const upload = multer({
  storage: createStorage(),
  fileFilter
})

// Upload images
export const uploadImages = async (req: UploadRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      return sendError(res, '没有上传任何文件', 400)
    }

    const uploadedFiles = files.map(file => {
      const relativePath = path.relative(getPublicPath(), file.path).replace(/\\/g, '/')

      return {
        name: file.originalname,
        path: `/${relativePath}`,
        size: file.size,
        createTime: new Date().toISOString(),
        modifyTime: new Date().toISOString()
      }
    })

    sendSuccess(res, uploadedFiles)
  } catch (error) {
    console.error('Error uploading images:', error)
    sendError(res, '上传图片失败', 500, error instanceof Error ? error.message : String(error))
  }
}

// Upload images with custom path
export const uploadImagesWithPath = async (req: Request, res: Response) => {
  try {
    const bb = busboy({ headers: req.headers })
    let uploadPath = ''
    const fileBuffers: Array<{
      fieldname: string
      originalname: string
      buffer: Buffer
      mimetype: string
    }> = []

    bb.on('field', (name: string, val: string) => {
      if (name === 'uploadPath') {
        uploadPath = val
      }
    })

    bb.on(
      'file',
      (
        name: string,
        file: NodeJS.ReadableStream,
        info: { filename: string; encoding: string; mimeType: string }
      ) => {
        const chunks: Buffer[] = []
        file.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })
        file.on('end', () => {
          fileBuffers.push({
            fieldname: name,
            originalname: info.filename,
            buffer: Buffer.concat(chunks),
            mimetype: info.mimeType
          })
        })
      }
    )

    bb.on('close', async () => {
      try {
        // Validate and sanitize uploadPath
        if (uploadPath && (uploadPath.includes('..') || uploadPath.includes('~'))) {
          uploadPath = ''
        }

        const publicPath = getPublicPath()
        const uploadDir = path.join(publicPath, uploadPath)

        // Ensure directory exists
        try {
          await fs.access(uploadDir)
        } catch {
          await fs.mkdir(uploadDir, { recursive: true })
        }

        // Process each file
        const uploadedFiles: Array<{
          name: string
          path: string
          size: number
          createTime: string
          modifyTime: string
        }> = []

        for (const fileData of fileBuffers) {
          // Validate file type
          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
          if (!allowedTypes.includes(fileData.mimetype)) {
            continue
          }

          // Generate filename
          const ext = path.extname(fileData.originalname)
          const nameWithoutExt = path.basename(fileData.originalname, ext)
          const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace(/[TZ]/g, '-')
          const finalName = `${nameWithoutExt}-${timestamp}${ext}`
            .toLowerCase()
            .replace(/\s+/g, '-')

          const filePath = path.join(uploadDir, finalName)

          // Write file
          await fs.writeFile(filePath, fileData.buffer)

          const relativePath = path.relative(getPublicPath(), filePath).replace(/\\/g, '/')

          uploadedFiles.push({
            name: fileData.originalname,
            path: `/${relativePath}`,
            size: fileData.buffer.length,
            createTime: new Date().toISOString(),
            modifyTime: new Date().toISOString()
          })
        }

        sendSuccess(res, uploadedFiles)
      } catch (error) {
        console.error('Error processing files:', error)
        sendError(res, '处理文件失败', 500, error instanceof Error ? error.message : String(error))
      }
    })

    req.pipe(bb)
  } catch (error) {
    console.error('Error uploading images with path:', error)
    sendError(res, '上传图片失败', 500, error instanceof Error ? error.message : String(error))
  }
}
