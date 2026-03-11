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
import {
  getTableData,
  insertRow,
  updateRow,
  deleteRow,
  createTable
} from '../controllers/database/tableData.js'

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

// Table data CRUD
router.get('/table-data', getTableData)
router.post('/rows', insertRow)
router.put('/rows', updateRow)
router.delete('/rows', deleteRow)
router.post('/tables', createTable)

export default router
