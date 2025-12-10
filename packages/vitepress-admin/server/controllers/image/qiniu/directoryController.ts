import { Request, Response } from 'express'
import qiniu from 'qiniu'
import { sendSuccess, sendError } from '../../../utils/response.js'
import { getQiniuZone } from '../../../utils/imageUtils.js'
import { loadQiniuConfig } from './configHelper.js'
import type { DirectoryItem, Breadcrumb } from '../../../types/image.js'

// Create directory in Qiniu (using marker file)
export const createQiniuDirectory = async (req: Request, res: Response) => {
  try {
    const { dirPath, directoryName } = req.body
    if (!directoryName) {
      return sendError(res, '缺少目录名称参数', 400)
    }

    if (
      directoryName.includes('..') ||
      directoryName.includes('/') ||
      directoryName.includes('\\')
    ) {
      return sendError(res, '无效的目录名称', 400)
    }

    const config = await loadQiniuConfig()
    if (!config) {
      return sendError(res, '七牛云配置未找到', 400)
    }

    const { accessKey, secretKey, bucket, region } = config.qiniuStorage

    const currentDir = dirPath || ''
    const newDirPath = currentDir
      ? `${currentDir}${currentDir.endsWith('/') ? '' : '/'}${directoryName}/`
      : `${directoryName}/`

    const markerKey = `${newDirPath}.qiniu_dir_marker`

    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
    const options = { scope: bucket, expires: 7200 }
    const putPolicy = new qiniu.rs.PutPolicy(options)
    const uploadToken = putPolicy.uploadToken(mac)

    const qiniuConfig = new qiniu.conf.Config()
    qiniuConfig.zone = getQiniuZone(region)
    const formUploader = new qiniu.form_up.FormUploader(qiniuConfig)
    const putExtra = new qiniu.form_up.PutExtra()

    await new Promise<void>((resolve, reject) => {
      formUploader.put(uploadToken, markerKey, Buffer.from(''), putExtra, (err, _body, info) => {
        if (err) {
          reject(err)
        } else if (info.statusCode === 200) {
          resolve()
        } else {
          reject(new Error(`Create directory failed with status: ${info.statusCode}`))
        }
      })
    })

    sendSuccess(res, null, '目录创建成功')
  } catch (error) {
    console.error('Error creating Qiniu directory:', error)
    sendError(res, '创建目录失败', 500, error instanceof Error ? error.message : String(error))
  }
}

// Delete directory from Qiniu (delete all files with prefix)
export const deleteQiniuDirectory = async (req: Request, res: Response) => {
  try {
    const { directoryPath } = req.body
    if (!directoryPath) {
      return sendError(res, '缺少目录路径参数', 400)
    }

    const config = await loadQiniuConfig()
    if (!config) {
      return sendError(res, '七牛云配置未找到', 400)
    }

    const { accessKey, secretKey, bucket, region } = config.qiniuStorage

    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
    const bucketConfig = new qiniu.conf.Config()
    bucketConfig.zone = getQiniuZone(region)
    const bucketManager = new qiniu.rs.BucketManager(mac, bucketConfig)

    const dirPrefix = directoryPath.endsWith('/') ? directoryPath : `${directoryPath}/`

    interface ListResult {
      items?: Array<{ key: string }>
    }

    const listResult = await new Promise<ListResult>((resolve, reject) => {
      bucketManager.listPrefix(
        bucket,
        { prefix: dirPrefix, limit: 1000 },
        (err, respBody, respInfo) => {
          if (err) {
            reject(err)
          } else if (respInfo.statusCode === 200) {
            resolve(respBody)
          } else {
            reject(new Error(`List failed with status: ${respInfo.statusCode}`))
          }
        }
      )
    })

    if (listResult.items && listResult.items.length > 0) {
      const deleteOps = listResult.items.map(item => qiniu.rs.deleteOp(bucket, item.key))

      await new Promise<void>((resolve, reject) => {
        bucketManager.batch(deleteOps, (err, _respBody, respInfo) => {
          if (err) {
            reject(err)
          } else if (respInfo.statusCode === 200) {
            resolve()
          } else {
            reject(new Error(`Batch delete failed with status: ${respInfo.statusCode}`))
          }
        })
      })
    }

    sendSuccess(res, null, '目录删除成功')
  } catch (error) {
    console.error('Error deleting Qiniu directory:', error)
    sendError(res, '删除目录失败', 500, error instanceof Error ? error.message : String(error))
  }
}

// Get Qiniu directories for upload path selection
export const getQiniuDirectories = async (req: Request, res: Response) => {
  try {
    const { prefix = '' } = req.query

    const config = await loadQiniuConfig()
    if (!config) {
      return sendError(res, '七牛云配置未找到', 400)
    }

    const { accessKey, secretKey, bucket, region } = config.qiniuStorage

    const currentPrefix = (prefix as string) || ''

    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
    const bucketConfig = new qiniu.conf.Config()
    bucketConfig.zone = getQiniuZone(region)
    const bucketManager = new qiniu.rs.BucketManager(mac, bucketConfig)

    interface DirectoryListResult {
      commonPrefixes?: string[]
    }

    try {
      const listResult = await new Promise<DirectoryListResult>((resolve, reject) => {
        bucketManager.listPrefix(
          bucket,
          { prefix: currentPrefix, limit: 1000, delimiter: '/' },
          (err, respBody, respInfo) => {
            if (err) {
              reject(err)
            } else if (respInfo.statusCode === 200) {
              resolve(respBody)
            } else {
              reject(new Error(`List failed with status: ${respInfo.statusCode}`))
            }
          }
        )
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

      directories.sort((a, b) => a.name.localeCompare(b.name))

      const breadcrumbs: Breadcrumb[] = [{ name: '根目录', path: '' }]
      if (currentPrefix) {
        const pathParts = currentPrefix.split('/').filter(Boolean)
        let currentPath = ''

        for (const part of pathParts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part
          breadcrumbs.push({ name: part, path: currentPath })
        }
      }

      sendSuccess(res, {
        directories,
        currentPath: currentPrefix,
        breadcrumbs
      })
    } catch (error) {
      console.error('Error listing Qiniu directories:', error)
      sendError(
        res,
        '获取七牛云目录列表失败',
        500,
        error instanceof Error ? error.message : String(error)
      )
    }
  } catch (error) {
    console.error('Error in getQiniuDirectories:', error)
    sendError(res, '获取目录列表失败', 500, error instanceof Error ? error.message : String(error))
  }
}
