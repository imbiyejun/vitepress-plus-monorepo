import express from 'express'
import multer from 'multer'
import os from 'os'
import path from 'path'
import {
  getServerStatus,
  testConnection,
  listDirectory,
  readFile,
  writeFile,
  createDirectory,
  deleteFile,
  deleteDirectory,
  rename,
  uploadFile,
  uploadFiles,
  downloadFile
} from '../controllers/server/index.js'

const router: express.Router = express.Router()

// Configure multer for file uploads
const upload = multer({
  dest: path.join(os.tmpdir(), 'vpa-server-uploads'),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
})

// Status and connection
router.get('/status', getServerStatus)
router.post('/test-connection', testConnection)

// Directory operations
router.get('/directory', listDirectory)
router.post('/directory', createDirectory)
router.delete('/directory', deleteDirectory)

// File operations
router.get('/file', readFile)
router.put('/file', writeFile)
router.delete('/file', deleteFile)
router.post('/rename', rename)

// File transfer
router.post('/upload', upload.single('file'), uploadFile)
router.post('/upload-multiple', upload.array('files', 20), uploadFiles)
router.get('/download', downloadFile)

export default router
