import { Client as SSHClient } from 'ssh2'
import mysql from 'mysql2/promise'
import type { Connection, RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise'
import type { Duplex } from 'stream'
import type {
  DatabaseConfig,
  DatabaseInfo,
  TableInfo,
  ColumnInfo,
  QueryResult
} from '../types/database.js'
import { serverService } from './serverService.js'

class DatabaseService {
  getDatabaseConfig(): DatabaseConfig | null {
    const username = process.env.DB_USERNAME
    const password = process.env.DB_PASSWORD
    if (!username || !password) return null

    return {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username,
      password,
      database: process.env.DB_DATABASE || undefined
    }
  }

  // Create a MySQL connection tunneled through SSH
  private async createConnection(
    database?: string,
    overrideConfig?: Partial<DatabaseConfig>
  ): Promise<{ conn: Connection; ssh: SSHClient }> {
    const serverConfig = serverService.getServerConfig()
    if (!serverConfig) throw new Error('Server SSH configuration not found')

    const dbConfig = this.getDatabaseConfig()
    if (!dbConfig && !overrideConfig)
      throw new Error('Database configuration not found. Add DB_USERNAME and DB_PASSWORD to .env')

    const finalConfig = { ...dbConfig, ...overrideConfig } as DatabaseConfig

    const ssh = new SSHClient()

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ssh.end()
        reject(new Error('SSH connection timeout'))
      }, 15000)
      ssh.on('ready', () => {
        clearTimeout(timeout)
        resolve()
      })
      ssh.on('error', err => {
        clearTimeout(timeout)
        reject(err)
      })
      ssh.connect({
        host: serverConfig.host,
        port: serverConfig.port,
        username: serverConfig.username,
        password: serverConfig.password
      })
    })

    // Forward TCP through SSH tunnel to remote MySQL
    const stream = await new Promise<Duplex>((resolve, reject) => {
      ssh.forwardOut(
        '127.0.0.1',
        0,
        finalConfig.host || '127.0.0.1',
        finalConfig.port || 3306,
        (err, s) => {
          if (err) reject(err)
          else resolve(s as unknown as Duplex)
        }
      )
    })

    const conn = await mysql.createConnection({
      user: finalConfig.username,
      password: finalConfig.password,
      database: database || finalConfig.database,
      stream,
      connectTimeout: 10000
    })

    return { conn, ssh }
  }

  // Execute a query and safely close connections
  private async withConnection<T>(
    fn: (conn: Connection) => Promise<T>,
    database?: string,
    overrideConfig?: Partial<DatabaseConfig>
  ): Promise<T> {
    const { conn, ssh } = await this.createConnection(database, overrideConfig)
    try {
      return await fn(conn)
    } finally {
      await conn.end().catch(() => {})
      ssh.end()
    }
  }

  async testConnection(): Promise<boolean> {
    return this.withConnection(async conn => {
      await conn.query('SELECT 1')
      return true
    })
  }

  async listDatabases(): Promise<DatabaseInfo[]> {
    return this.withConnection(async conn => {
      const [rows] = await conn.query<RowDataPacket[]>('SHOW DATABASES')
      const databases: DatabaseInfo[] = []

      for (const row of rows) {
        const name = row['Database'] as string
        try {
          const [tableRows] = await conn.query<RowDataPacket[]>(
            `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ?`,
            [name]
          )
          databases.push({ name, tables: (tableRows[0]?.cnt as number) ?? 0 })
        } catch {
          databases.push({ name, tables: 0 })
        }
      }
      return databases
    })
  }

  async listTables(database: string): Promise<TableInfo[]> {
    return this.withConnection(async conn => {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT
          TABLE_NAME as name,
          TABLE_ROWS as \`rows\`,
          ENGINE as engine,
          TABLE_COLLATION as collation,
          ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 2) as size_kb,
          TABLE_COMMENT as comment
        FROM information_schema.tables
        WHERE table_schema = ?
        ORDER BY TABLE_NAME`,
        [database]
      )
      return rows.map(r => ({
        name: r.name as string,
        rows: r.rows as number | null,
        engine: r.engine as string | null,
        collation: r.collation as string | null,
        size: r.size_kb ? `${r.size_kb} KB` : null,
        comment: (r.comment as string) || ''
      }))
    }, database)
  }

  async getTableColumns(database: string, table: string): Promise<ColumnInfo[]> {
    return this.withConnection(async conn => {
      const [rows] = await conn.query<RowDataPacket[]>(`DESCRIBE \`${table}\``)
      return rows.map(r => ({
        name: r['Field'] as string,
        type: r['Type'] as string,
        nullable: r['Null'] === 'YES',
        key: (r['Key'] as string) || '',
        defaultValue: r['Default'] as string | null,
        extra: (r['Extra'] as string) || ''
      }))
    }, database)
  }

  async executeQuery(database: string, sql: string): Promise<QueryResult> {
    return this.withConnection(async conn => {
      const startTime = Date.now()
      const [result, fields] = (await conn.query(sql)) as [
        RowDataPacket[] | ResultSetHeader,
        FieldPacket[]
      ]
      const executionTime = Date.now() - startTime

      // SELECT-like queries return rows
      if (Array.isArray(result)) {
        const columns = fields?.map(f => f.name) || []
        return {
          columns,
          rows: result as Record<string, unknown>[],
          affectedRows: 0,
          message: `查询完成，返回 ${result.length} 行`,
          executionTime
        }
      }

      // INSERT/UPDATE/DELETE return ResultSetHeader
      const header = result as ResultSetHeader
      return {
        columns: [],
        rows: [],
        affectedRows: header.affectedRows || 0,
        message: `执行完成，影响 ${header.affectedRows} 行`,
        executionTime
      }
    }, database)
  }

  async createDatabase(
    name: string,
    charset = 'utf8mb4',
    collation = 'utf8mb4_general_ci'
  ): Promise<void> {
    return this.withConnection(async conn => {
      await conn.query(`CREATE DATABASE \`${name}\` CHARACTER SET ${charset} COLLATE ${collation}`)
    })
  }

  async dropDatabase(name: string): Promise<void> {
    return this.withConnection(async conn => {
      await conn.query(`DROP DATABASE \`${name}\``)
    })
  }

  // Change MySQL user password via SSH command (works even without .env DB config)
  async changePassword(
    currentUsername: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const escapedCurrent = currentPassword.replace(/'/g, "'\\''")
    const escapedNew = newPassword.replace(/'/g, "'\\''")
    const cmd = `mysql -u '${currentUsername}' -p'${escapedCurrent}' -e "ALTER USER '${currentUsername}'@'localhost' IDENTIFIED BY '${escapedNew}'; FLUSH PRIVILEGES;" 2>&1`

    const result = await serverService.executeCommand(cmd, 15000)
    if (!result.success && !result.output.includes('Warning')) {
      throw new Error(result.output || 'Failed to change password')
    }
  }
}

export const databaseService = new DatabaseService()
