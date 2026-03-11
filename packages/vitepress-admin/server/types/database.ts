// Database management types for remote MySQL via SSH tunnel

export interface DatabaseConfig {
  host: string
  port: number
  username: string
  password: string
  database?: string
}

export interface DatabaseStatus {
  configured: boolean
  host?: string
  port?: number
  username?: string
}

export interface DatabaseInfo {
  name: string
  tables?: number
}

export interface TableInfo {
  name: string
  rows: number | null
  engine: string | null
  collation: string | null
  size: string | null
  comment: string
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  key: string
  defaultValue: string | null
  extra: string
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  affectedRows: number
  message: string
  executionTime: number
}

export interface ChangePasswordParams {
  currentUsername: string
  currentPassword: string
  newPassword: string
}

export interface CreateDatabaseParams {
  name: string
  charset?: string
  collation?: string
}

// Table data CRUD types
export interface TableDataQuery {
  database: string
  table: string
  page?: number
  pageSize?: number
  orderBy?: string
  orderDir?: 'ASC' | 'DESC'
  search?: string
}

export interface TableDataResult {
  columns: ColumnInfo[]
  rows: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  primaryKeys: string[]
}

export interface RowInsertParams {
  database: string
  table: string
  row: Record<string, unknown>
}

export interface RowUpdateParams {
  database: string
  table: string
  primaryKeyValues: Record<string, unknown>
  changes: Record<string, unknown>
}

export interface RowDeleteParams {
  database: string
  table: string
  primaryKeyValues: Record<string, unknown>
}

export interface CreateTableColumn {
  name: string
  type: string
  length?: string
  nullable?: boolean
  defaultValue?: string
  autoIncrement?: boolean
  primaryKey?: boolean
  comment?: string
}

export interface CreateTableParams {
  database: string
  tableName: string
  columns: CreateTableColumn[]
  engine?: string
  charset?: string
  comment?: string
}
