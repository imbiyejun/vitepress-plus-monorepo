import express from 'express'
import {
  getDeployStatus,
  startDeploy,
  getTaskStatus,
  testConnection
} from '../controllers/deploy/index.js'

const router: express.Router = express.Router()

router.get('/status', getDeployStatus)
router.post('/start', startDeploy)
router.get('/task', getTaskStatus)
router.post('/test-connection', testConnection)

export default router
