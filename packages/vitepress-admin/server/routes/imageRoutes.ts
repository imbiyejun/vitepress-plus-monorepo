import express from 'express'
import {
  getAllImages,
  getDirectoryContents,
  uploadImagesWithPath,
  deleteImage,
  renameImage,
  checkImageName,
  createDirectory,
  deleteDirectory,
  getImageConfig,
  testQiniuUpload,
  getQiniuImages,
  uploadToQiniu,
  deleteQiniuImage,
  renameQiniuImage,
  downloadQiniuImage,
  createQiniuDirectory,
  deleteQiniuDirectory,
  getQiniuDirectories,
  getLocalDirectories
} from '../controllers/image'

const router = express.Router()

// Existing image management routes
router.get('/list', getAllImages)
// New directory browsing route
router.get('/directory', getDirectoryContents)
// Use new upload handler that processes uploadPath
router.post('/upload', uploadImagesWithPath)
router.post('/delete', deleteImage)
router.post('/rename', renameImage)
router.post('/check-name', checkImageName)
router.post('/create-directory', createDirectory)
router.post('/delete-directory', deleteDirectory)

// Image configuration routes (read-only)
router.get('/config', getImageConfig)
router.post('/qiniu/test-upload', testQiniuUpload)

// Qiniu cloud image management routes
router.get('/qiniu/list', getQiniuImages)
router.post('/qiniu/upload', uploadToQiniu)
router.post('/qiniu/delete', deleteQiniuImage)
router.post('/qiniu/rename', renameQiniuImage)
router.get('/qiniu/download', downloadQiniuImage)
router.post('/qiniu/create-directory', createQiniuDirectory)
router.post('/qiniu/delete-directory', deleteQiniuDirectory)
router.get('/qiniu/directories', getQiniuDirectories)

// Directory listing routes for upload path selection
router.get('/directories', getLocalDirectories)

export default router
