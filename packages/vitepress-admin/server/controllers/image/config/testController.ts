import { Request, Response } from 'express'
import qiniu from 'qiniu'
import { sendSuccess, sendError } from '../../../utils/response'
import { getQiniuZone } from '../../../utils/imageUtils'
import type { QiniuConfig } from '../../../types/image'

// Test Qiniu upload functionality with real upload
export const testQiniuUpload = async (req: Request, res: Response) => {
  try {
    const qiniuConfig: QiniuConfig = req.body

    // Validate required fields
    const { accessKey, secretKey, bucket, domain, region } = qiniuConfig
    if (!accessKey || !secretKey || !bucket || !domain || !region) {
      return sendError(res, '七牛云配置信息不完整', 400)
    }

    // Validate domain format
    if (!/^https?:\/\/.+/.test(domain)) {
      return sendError(res, '访问网址格式不正确，请包含 http:// 或 https://', 400)
    }

    // Validate region
    const validRegions = ['z0', 'z1', 'z2', 'na0', 'as0']
    if (!validRegions.includes(region)) {
      return sendError(res, '存储区域不正确', 400)
    }

    try {
      // Create authentication object
      const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)

      // Configure upload options
      const options = { scope: bucket, expires: 7200 }
      const putPolicy = new qiniu.rs.PutPolicy(options)
      const uploadToken = putPolicy.uploadToken(mac)

      // Configure upload region
      const config = new qiniu.conf.Config()
      config.zone = getQiniuZone(region)
      config.useHttpsDomain = domain.startsWith('https://')
      config.useCdnDomain = true

      // Create upload objects
      const formUploader = new qiniu.form_up.FormUploader(config)
      const putExtra = new qiniu.form_up.PutExtra()

      // Create test file content (small PNG image - 1x1 transparent pixel)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
        0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00,
        0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
      ])

      // Generate test filename with path prefix if provided
      const timestamp = Date.now()
      const pathPrefix = qiniuConfig.path || ''
      const testFileName = `${pathPrefix}test-upload-${timestamp}.png`

      // Perform actual upload test
      await new Promise<void>((resolve, _reject) => {
        formUploader.put(
          uploadToken,
          testFileName,
          testImageBuffer,
          putExtra,
          (err, body, info) => {
            if (err) {
              console.error('Qiniu upload error:', err)
              sendError(res, '上传测试失败', 500, err.message || String(err))
              resolve()
            } else if (info.statusCode === 200) {
              const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain
              const finalUrl = `${baseUrl}/${body.key}${qiniuConfig.urlSuffix || ''}`

              sendSuccess(
                res,
                {
                  key: body.key,
                  hash: body.hash,
                  testUrl: finalUrl,
                  config: {
                    accessKey: accessKey.substring(0, 8) + '***',
                    bucket,
                    domain,
                    region,
                    urlSuffix: qiniuConfig.urlSuffix || '',
                    path: pathPrefix
                  }
                },
                '测试上传成功'
              )
              resolve()
            } else {
              console.error('Qiniu upload failed:', info.statusCode, body)

              let errorMessage = '上传测试失败'
              let details = `HTTP ${info.statusCode}`

              if (body && typeof body === 'object') {
                if (body.error_code === 'BadToken') {
                  errorMessage = '认证失败'
                  details = 'AccessKey 或 SecretKey 不正确，或者存储空间名称错误'
                } else if (body.error_code === 'InvalidBucket') {
                  errorMessage = '存储空间不存在'
                  details = '请检查 Bucket 名称是否正确'
                } else if (body.error_code === 'NoSuchBucket') {
                  errorMessage = '存储空间不存在'
                  details = '指定的存储空间不存在，请检查 Bucket 名称'
                } else if (body.error_code === 'InvalidRegion') {
                  errorMessage = '存储区域错误'
                  details = '存储区域与存储空间不匹配'
                } else if (body.error) {
                  details = body.error
                } else {
                  details = JSON.stringify(body)
                }
              }

              sendError(res, errorMessage, info.statusCode || 500, details)
              resolve()
            }
          }
        )
      })
    } catch (sdkError) {
      console.error('Qiniu SDK error:', sdkError)
      sendError(
        res,
        '七牛云SDK初始化失败',
        500,
        sdkError instanceof Error ? sdkError.message : String(sdkError)
      )
    }
  } catch (error) {
    console.error('Error testing qiniu upload:', error)
    sendError(res, '测试上传失败', 500, error instanceof Error ? error.message : String(error))
  }
}
