import type { Request, Response } from 'express'
import { databaseService } from '../../services/databaseService.js'
import type {
  TableDataQuery,
  RowInsertParams,
  RowUpdateParams,
  RowDeleteParams,
  CreateTableParams
} from '../../types/database.js'

export const getTableData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { database, table, page, pageSize, orderBy, orderDir, search } =
      req.query as unknown as TableDataQuery

    if (!database || !table) {
      res.status(400).json({ error: 'database and table are required' })
      return
    }

    const result = await databaseService.getTableData(
      database,
      table,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 100,
      orderBy as string | undefined,
      (orderDir as 'ASC' | 'DESC') || 'ASC',
      search as string | undefined
    )
    res.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const insertRow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { database, table, row } = req.body as RowInsertParams
    if (!database || !table || !row) {
      res.status(400).json({ error: 'database, table and row are required' })
      return
    }
    const result = await databaseService.insertRow(database, table, row)
    res.json({ success: true, ...result })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const updateRow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { database, table, primaryKeyValues, changes } = req.body as RowUpdateParams
    if (!database || !table || !primaryKeyValues || !changes) {
      res.status(400).json({ error: 'database, table, primaryKeyValues and changes are required' })
      return
    }
    const result = await databaseService.updateRow(database, table, primaryKeyValues, changes)
    res.json({ success: true, ...result })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const createTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { database, tableName, columns, engine, charset, comment } = req.body as CreateTableParams
    if (!database || !tableName || !columns?.length) {
      res.status(400).json({ error: 'database, tableName and columns are required' })
      return
    }
    await databaseService.createTable(database, tableName, columns, engine, charset, comment)
    res.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const deleteRow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { database, table, primaryKeyValues } = req.body as RowDeleteParams
    if (!database || !table || !primaryKeyValues) {
      res.status(400).json({ error: 'database, table and primaryKeyValues are required' })
      return
    }
    const result = await databaseService.deleteRow(database, table, primaryKeyValues)
    res.json({ success: true, ...result })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}
