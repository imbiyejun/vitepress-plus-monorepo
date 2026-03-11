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
