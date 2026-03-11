import type { Request, Response } from 'express'
import { databaseService } from '../../services/databaseService.js'
import type { ChangePasswordParams, CreateDatabaseParams } from '../../types/database.js'

export const getDatabaseStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = databaseService.getDatabaseConfig()
    if (!config) {
      res.json({ configured: false })
      return
    }
    res.json({
      configured: true,
      host: config.host,
      port: config.port,
      username: config.username
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const testDatabaseConnection = async (_req: Request, res: Response): Promise<void> => {
  try {
    await databaseService.testConnection()
    res.json({ connected: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Connection failed'
    res.status(500).json({ error: msg, connected: false })
  }
}

export const listDatabases = async (_req: Request, res: Response): Promise<void> => {
  try {
    const databases = await databaseService.listDatabases()
    res.json({ databases })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const createDatabase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, charset, collation } = req.body as CreateDatabaseParams
    if (!name) {
      res.status(400).json({ error: 'Database name is required' })
      return
    }
    await databaseService.createDatabase(name, charset, collation)
    res.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const dropDatabase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body as { name: string }
    if (!name) {
      res.status(400).json({ error: 'Database name is required' })
      return
    }
    await databaseService.dropDatabase(name)
    res.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const listTables = async (req: Request, res: Response): Promise<void> => {
  try {
    const { database } = req.query as { database: string }
    if (!database) {
      res.status(400).json({ error: 'Database name is required' })
      return
    }
    const tables = await databaseService.listTables(database)
    res.json({ tables })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const getTableColumns = async (req: Request, res: Response): Promise<void> => {
  try {
    const { database, table } = req.query as { database: string; table: string }
    if (!database || !table) {
      res.status(400).json({ error: 'database and table are required' })
      return
    }
    const columns = await databaseService.getTableColumns(database, table)
    res.json({ columns })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const executeQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { database, sql } = req.body as { database: string; sql: string }
    if (!database || !sql) {
      res.status(400).json({ error: 'database and sql are required' })
      return
    }
    const result = await databaseService.executeQuery(database, sql)
    res.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentUsername, currentPassword, newPassword } = req.body as ChangePasswordParams
    if (!currentUsername || !currentPassword || !newPassword) {
      res.status(400).json({ error: 'All fields are required' })
      return
    }
    await databaseService.changePassword(currentUsername, currentPassword, newPassword)
    res.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}
