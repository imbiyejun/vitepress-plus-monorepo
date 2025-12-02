// Import imageApi first
import { imageApi } from './api'

// Export all image-related types and imageApi from the unified API
export {
  imageApi,
  type ImageInfo,
  type DirectoryItem,
  type Breadcrumb,
  type PaginationInfo,
  type DirectoryContents,
  type DirectoryListData,
  type ImageConfig,
  type QiniuConfig,
  type LocalConfig
} from './api'

// Re-export for backward compatibility
export const getImageList = imageApi.getImageList
export const getDirectoryContents = imageApi.getDirectoryContents
export const uploadImages = imageApi.uploadImages
export const deleteImage = imageApi.deleteImage
export const checkImageName = imageApi.checkImageName
export const renameImage = imageApi.renameImage
export const createDirectory = imageApi.createDirectory
export const deleteDirectory = imageApi.deleteDirectory
export const getQiniuImages = imageApi.getQiniuImages
export const uploadToQiniu = imageApi.uploadToQiniu
export const deleteQiniuImage = imageApi.deleteQiniuImage
export const renameQiniuImage = imageApi.renameQiniuImage
export const downloadQiniuImage = imageApi.downloadQiniuImage
export const createQiniuDirectory = imageApi.createQiniuDirectory
export const deleteQiniuDirectory = imageApi.deleteQiniuDirectory
export const getLocalDirectories = imageApi.getLocalDirectories
export const getQiniuDirectories = imageApi.getQiniuDirectories

// Qiniu image name check (always returns true as Qiniu allows overwrite)
export const checkQiniuImageName = async (
  _imagePath: string,
  _newName: string
): Promise<boolean> => {
  return true
}
