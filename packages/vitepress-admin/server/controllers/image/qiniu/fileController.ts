import path from 'path'
import { Request, Response } from 'express'
import qiniu from 'qiniu'
import { sendSuccess, sendError } from '../../../utils/response'
import { getQiniuZone } from '../../../utils/imageUtils'
import { loadQiniuConfig } from './configHelper'
import type { DirectoryItem, Breadcrumb } from '../../../types/image'

// Get Qiniu images list with directory support, pagination and search
export const getQiniuImages = async (req: Request, res: Response) => {
  try {
    const { prefix = '', page = '1', pageSize = '50', marker = '', search = '' } = req.query

    const config = await loadQiniuConfig()
    if (!config) {
      return sendError(res, '七牛云配置未找到', 400)
    }

    const { accessKey, secretKey, bucket, domain, region } = config.qiniuStorage
    if (!accessKey || !secretKey || !bucket || !domain) {
      return sendError(res, '七牛云配置不完整', 400)
    }

    const currentPage = parseInt(page as string) || 1
    const limit = parseInt(pageSize as string) || 50
    const currentMarker = (marker as string) || ''
    const currentPrefix = (prefix as string) || ''
    const searchKeyword = (search as string) || ''

    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
    const bucketConfig = new qiniu.conf.Config()
    bucketConfig.zone = getQiniuZone(region)
    const bucketManager = new qiniu.rs.BucketManager(mac, bucketConfig)

    interface QiniuItem {
      key: string
      fsize?: number
      putTime?: number
    }

    interface QiniuListResult {
      items?: QiniuItem[]
      commonPrefixes?: string[]
      marker?: string
    }

    try {
      const listResult = await new Promise<QiniuListResult>((resolve, reject) => {
        // Build options object - only include marker if it's not empty
        const options: {
          prefix: string
          limit: number
          delimiter: string
          marker?: string
        } = {
          prefix: currentPrefix,
          limit: limit,
          delimiter: '/'
        }

        // Only add marker if it exists and is not empty
        if (currentMarker && currentMarker.trim() !== '') {
          options.marker = currentMarker
        }

        bucketManager.listPrefix(bucket, options, (err, respBody, respInfo) => {
          if (err) {
            console.error('Qiniu SDK error:', err)
            reject(err)
          } else if (respInfo.statusCode === 200) {
            resolve(respBody)
          } else {
            console.error('Qiniu API error:', {
              statusCode: respInfo.statusCode,
              body: respBody,
              options: options
            })
            reject(new Error(`List failed with status: ${respInfo.statusCode}`))
          }
        })
      })

      const directories: DirectoryItem[] = []
      if (listResult.commonPrefixes && Array.isArray(listResult.commonPrefixes)) {
        for (const dirPrefix of listResult.commonPrefixes) {
          const dirName = dirPrefix.replace(currentPrefix, '').replace(/\/$/, '')
          if (dirName) {
            directories.push({ name: dirName, type: 'directory', path: dirPrefix })
          }
        }
      }

      const files: DirectoryItem[] = []
      let hasMoreFiles = false
      let nextMarker = ''

      if (listResult.items && Array.isArray(listResult.items)) {
        const fileItems = listResult.items.slice(0, limit)

        // Qiniu returns 'marker' field when there are more items
        // If marker exists, there are more items to fetch
        hasMoreFiles = !!listResult.marker

        // Use the marker returned by Qiniu API for next request
        if (listResult.marker) {
          nextMarker = listResult.marker
        }

        const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain
        const urlSuffix = config.qiniuStorage.urlSuffix || ''

        for (const item of fileItems) {
          if (!item.key.endsWith('/')) {
            const fileName = path.basename(item.key)
            const ext = path.extname(fileName).toLowerCase()

            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
              const fileUrl = `${baseUrl}/${item.key}${urlSuffix}`

              if (
                !searchKeyword ||
                fileName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                item.key.toLowerCase().includes(searchKeyword.toLowerCase())
              ) {
                const timestamp = item.putTime
                  ? new Date(item.putTime / 10000).toISOString()
                  : new Date().toISOString()
                files.push({
                  name: fileName,
                  type: 'file',
                  path: fileUrl,
                  createTime: timestamp,
                  modifyTime: timestamp,
                  size: item.fsize || 0
                })
              }
            }
          }
        }
      }

      const breadcrumbs: Breadcrumb[] = [{ name: '根目录', path: '' }]
      if (currentPrefix) {
        const pathParts = currentPrefix.split('/').filter(Boolean)
        let currentPath = ''

        for (const part of pathParts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part
          breadcrumbs.push({ name: part, path: currentPath })
        }
      }

      const allItems = [...directories, ...files]

      sendSuccess(res, {
        items: allItems,
        currentPath: currentPrefix,
        breadcrumbs,
        pagination: {
          current: currentPage,
          pageSize: limit,
          total: currentPage === 1 ? directories.length + files.length : -1,
          hasMore: hasMoreFiles,
          nextMarker: nextMarker,
          hasPrevious: currentPage > 1
        }
      })
    } catch (error) {
      console.error('Error listing Qiniu files:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        params: { prefix: currentPrefix, page: currentPage, marker: currentMarker }
      })
      sendError(
        res,
        '获取七牛云文件列表失败',
        500,
        error instanceof Error ? error.message : String(error)
      )
    }
  } catch (error) {
    console.error('Error in getQiniuImages:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : undefined)
    sendError(
      res,
      '获取七牛云图片列表失败',
      500,
      error instanceof Error ? error.message : String(error)
    )
  }
}

// Delete image from Qiniu cloud
export const deleteQiniuImage = async (req: Request, res: Response) => {
  try {
    const { imagePath } = req.body
    if (!imagePath) {
      return sendError(res, '缺少图片路径参数', 400)
    }

    const config = await loadQiniuConfig()
    if (!config) {
      return sendError(res, '七牛云配置未找到', 400)
    }

    const { accessKey, secretKey, bucket, region } = config.qiniuStorage

    const url = new URL(imagePath)
    const key = url.pathname.substring(1)

    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
    const bucketConfig = new qiniu.conf.Config()
    bucketConfig.zone = getQiniuZone(region)
    const bucketManager = new qiniu.rs.BucketManager(mac, bucketConfig)

    await new Promise<void>((resolve, reject) => {
      bucketManager.delete(bucket, key, (err, _respBody, respInfo) => {
        if (err) {
          reject(err)
        } else if (respInfo.statusCode === 200) {
          resolve()
        } else {
          reject(new Error(`Delete failed with status: ${respInfo.statusCode}`))
        }
      })
    })

    sendSuccess(res, null, '删除成功')
  } catch (error) {
    console.error('Error deleting Qiniu image:', error)
    sendError(res, '删除失败', 500, error instanceof Error ? error.message : String(error))
  }
}

// Rename image in Qiniu cloud (copy + delete)
export const renameQiniuImage = async (req: Request, res: Response) => {
  try {
    const { imagePath, newName } = req.body
    if (!imagePath || !newName) {
      return sendError(res, '缺少必要参数', 400)
    }

    const config = await loadQiniuConfig()
    if (!config) {
      return sendError(res, '七牛云配置未找到', 400)
    }

    const { accessKey, secretKey, bucket, domain, region } = config.qiniuStorage

    const url = new URL(imagePath)
    const oldKey = url.pathname.substring(1)

    const ext = path.extname(oldKey)
    const dirPath = path.dirname(oldKey)
    const newKey = dirPath === '.' ? `${newName}${ext}` : `${dirPath}/${newName}${ext}`

    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
    const bucketConfig = new qiniu.conf.Config()
    bucketConfig.zone = getQiniuZone(region)
    const bucketManager = new qiniu.rs.BucketManager(mac, bucketConfig)

    // Copy file to new name
    await new Promise<void>((resolve, reject) => {
      bucketManager.copy(
        bucket,
        oldKey,
        bucket,
        newKey,
        { force: true },
        (err, _respBody, respInfo) => {
          if (err) {
            reject(err)
          } else if (respInfo.statusCode === 200) {
            resolve()
          } else {
            reject(new Error(`Copy failed with status: ${respInfo.statusCode}`))
          }
        }
      )
    })

    // Delete old file
    await new Promise<void>((resolve, reject) => {
      bucketManager.delete(bucket, oldKey, (err, _respBody, respInfo) => {
        if (err) {
          reject(err)
        } else if (respInfo.statusCode === 200) {
          resolve()
        } else {
          reject(new Error(`Delete failed with status: ${respInfo.statusCode}`))
        }
      })
    })

    const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain
    const newUrl = `${baseUrl}/${newKey}${config.qiniuStorage.urlSuffix || ''}`

    sendSuccess(res, {
      path: newUrl,
      name: `${newName}${ext}`,
      createTime: new Date().toISOString(),
      modifyTime: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error renaming Qiniu image:', error)
    sendError(res, '重命名失败', 500, error instanceof Error ? error.message : String(error))
  }
}

// Download image from Qiniu cloud
export const downloadQiniuImage = async (req: Request, res: Response) => {
  try {
    const { url } = req.query
    if (!url || typeof url !== 'string') {
      return sendError(res, '缺少图片URL参数', 400)
    }

    res.redirect(url)
  } catch (error) {
    console.error('Error downloading Qiniu image:', error)
    sendError(res, '下载失败', 500, error instanceof Error ? error.message : String(error))
  }
}
