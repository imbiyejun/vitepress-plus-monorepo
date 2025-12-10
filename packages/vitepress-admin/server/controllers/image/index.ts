// Export all local image management functions
export {
  upload,
  createStorage,
  fileFilter,
  handleMulterError,
  getDirectoryContents,
  getAllImages,
  deleteImage,
  renameImage,
  checkImageName,
  uploadImages,
  uploadImagesWithPath,
  createDirectory,
  deleteDirectory,
  getLocalDirectories
} from './local/index.js'

// Export all Qiniu cloud image management functions
export {
  getQiniuImages,
  uploadToQiniu,
  deleteQiniuImage,
  renameQiniuImage,
  downloadQiniuImage,
  createQiniuDirectory,
  deleteQiniuDirectory,
  getQiniuDirectories
} from './qiniu/index.js'

// Export configuration management functions
export { getImageConfig, testQiniuUpload } from './config/index.js'
