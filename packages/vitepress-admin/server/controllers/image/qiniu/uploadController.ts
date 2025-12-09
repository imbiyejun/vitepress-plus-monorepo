import path from 'path'
import { Request, Response } from 'express'
import qiniu from 'qiniu'
import busboy from 'busboy'
import { sendSuccess, sendError } from '../../../utils/response'
import { getQiniuZone } from '../../../utils/imageUtils'
import { loadQiniuConfig } from './configHelper'

// Upload images to Qiniu cloud
export const uploadToQiniu = async (req: Request, res: Response) => {
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
        const config = await loadQiniuConfig()
        if (!config) {
          return sendError(res, '七牛云配置未找到', 400)
        }

        const { accessKey, secretKey, bucket, domain, region } = config.qiniuStorage
        if (!accessKey || !secretKey || !bucket || !domain) {
          return sendError(res, '七牛云配置不完整', 400)
        }

        // Setup Qiniu upload
        const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
        const options = { scope: bucket, expires: 7200 }
        const putPolicy = new qiniu.rs.PutPolicy(options)
        const uploadToken = putPolicy.uploadToken(mac)

        const qiniuConfig = new qiniu.conf.Config()
        qiniuConfig.zone = getQiniuZone(region)
        qiniuConfig.useHttpsDomain = domain.startsWith('https://')
        qiniuConfig.useCdnDomain = true

        const formUploader = new qiniu.form_up.FormUploader(qiniuConfig)
        const putExtra = new qiniu.form_up.PutExtra()

        const uploadedFiles: Array<{
          name: string
          path: string
          size: number
          createTime: string
          modifyTime: string
        }> = []

        for (const fileData of fileBuffers) {
          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
          if (!allowedTypes.includes(fileData.mimetype)) {
            continue
          }

          const ext = path.extname(fileData.originalname)
          const nameWithoutExt = path.basename(fileData.originalname, ext)
          const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace(/[TZ]/g, '-')
          const finalName = `${nameWithoutExt}-${timestamp}${ext}`
            .toLowerCase()
            .replace(/\s+/g, '-')

          const fullPath = uploadPath
            ? `${uploadPath}${uploadPath.endsWith('/') ? '' : '/'}${finalName}`
            : finalName

          interface UploadResult {
            key: string
          }

          const uploadResult = await new Promise<UploadResult>((resolve, reject) => {
            formUploader.put(
              uploadToken,
              fullPath,
              fileData.buffer,
              putExtra,
              (err, body, info) => {
                if (err) {
                  reject(err)
                } else if (info.statusCode === 200) {
                  resolve(body)
                } else {
                  reject(new Error(`Upload failed with status: ${info.statusCode}`))
                }
              }
            )
          })

          const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain
          const finalUrl = `${baseUrl}/${uploadResult.key}${config.qiniuStorage.urlSuffix || ''}`

          uploadedFiles.push({
            name: fileData.originalname,
            path: finalUrl,
            size: fileData.buffer.length,
            createTime: new Date().toISOString(),
            modifyTime: new Date().toISOString()
          })
        }

        sendSuccess(res, uploadedFiles)
      } catch (error) {
        console.error('Error uploading to Qiniu:', error)
        sendError(
          res,
          '上传到七牛云失败',
          500,
          error instanceof Error ? error.message : String(error)
        )
      }
    })

    req.pipe(bb)
  } catch (error) {
    console.error('Error in uploadToQiniu:', error)
    sendError(res, '上传失败', 500, error instanceof Error ? error.message : String(error))
  }
}
