import express from 'express'
import {
  getDatabaseStatus,
  testDatabaseConnection,
  listDatabases,
  createDatabase,
  dropDatabase,
  listTables,
  getTableColumns,
  executeQuery,
  changePassword
} from '../controllers/database/index.js'

const router: express.Router = express.Router()

router.get('/status', getDatabaseStatus)
router.post('/test-connection', testDatabaseConnection)
router.get('/databases', listDatabases)
router.post('/databases', createDatabase)
router.delete('/databases', dropDatabase)
router.get('/tables', listTables)
router.get('/columns', getTableColumns)
router.post('/query', executeQuery)
router.post('/change-password', changePassword)

export default router
