import { Client as SSHClient, type ClientChannel, type SFTPWrapper } from 'ssh2'
import type { WebSocket } from 'ws'
import type {
  ServerConfig,
  ServerFileInfo,
  ServerDirectoryContents,
  ServerBreadcrumb,
  TerminalSession,
  TerminalMessage,
  FileContentResult,
  CommandResult
} from '../types/server.js'
import fs from 'fs'
import path from 'path'

// Terminal session storage
interface ActiveTerminal {
  session: TerminalSession
  client: SSHClient
  channel: ClientChannel | null
  ws: WebSocket
}

class ServerService {
  private terminals: Map<string, ActiveTerminal> = new Map()
  private sftpConnections: Map<string, { client: SSHClient; sftp: SFTPWrapper }> = new Map()

  // Get server config from environment variables
  getServerConfig(): ServerConfig | null {
    const { DEPLOY_HOST, DEPLOY_PORT, DEPLOY_USERNAME, DEPLOY_PASSWORD } = process.env

    if (!DEPLOY_HOST || !DEPLOY_USERNAME || !DEPLOY_PASSWORD) {
      return null
    }

    return {
      host: DEPLOY_HOST,
      port: parseInt(DEPLOY_PORT || '22', 10),
      username: DEPLOY_USERNAME,
      password: DEPLOY_PASSWORD
    }
  }

  // Create SSH connection for SFTP operations
  private async createSFTPConnection(): Promise<{ client: SSHClient; sftp: SFTPWrapper }> {
    const config = this.getServerConfig()
    if (!config) {
      throw new Error('Server configuration not found')
    }

    const client = new SSHClient()

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end()
        reject(new Error('Connection timeout'))
      }, 30000)

      client.on('ready', () => {
        clearTimeout(timeout)
        resolve()
      })

      client.on('error', err => {
        clearTimeout(timeout)
        reject(err)
      })

      client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password
      })
    })

    const sftp = await new Promise<SFTPWrapper>((resolve, reject) => {
      client.sftp((err, sftp) => {
        if (err) reject(err)
        else resolve(sftp)
      })
    })

    return { client, sftp }
  }

  // Get or create SFTP connection
  private async getSFTP(): Promise<SFTPWrapper> {
    const connectionId = 'default'
    const existing = this.sftpConnections.get(connectionId)

    if (existing) {
      return existing.sftp
    }

    const connection = await this.createSFTPConnection()
    this.sftpConnections.set(connectionId, connection)

    connection.client.on('close', () => {
      this.sftpConnections.delete(connectionId)
    })

    return connection.sftp
  }

  // Close SFTP connection
  closeSFTPConnection(): void {
    const connection = this.sftpConnections.get('default')
    if (connection) {
      connection.client.end()
      this.sftpConnections.delete('default')
    }
  }

  // List directory contents
  async listDirectory(dirPath: string): Promise<ServerDirectoryContents> {
    const sftp = await this.getSFTP()
    const normalizedPath = dirPath || '/'

    const files = await new Promise<ServerFileInfo[]>((resolve, reject) => {
      sftp.readdir(normalizedPath, (err, list) => {
        if (err) {
          reject(err)
          return
        }

        const items: ServerFileInfo[] = list.map(item => {
          const isDirectory = item.attrs.isDirectory()
          const isSymlink = item.attrs.isSymbolicLink()

          return {
            name: item.filename,
            path: path.posix.join(normalizedPath, item.filename),
            type: isSymlink ? 'symlink' : isDirectory ? 'directory' : 'file',
            size: item.attrs.size,
            mode: (item.attrs.mode & 0o777).toString(8).padStart(3, '0'),
            modifyTime: new Date(item.attrs.mtime * 1000).toISOString(),
            accessTime: new Date(item.attrs.atime * 1000).toISOString(),
            owner: item.attrs.uid,
            group: item.attrs.gid
          }
        })

        // Sort: directories first, then files, alphabetically
        items.sort((a, b) => {
          if (a.type === 'directory' && b.type !== 'directory') return -1
          if (a.type !== 'directory' && b.type === 'directory') return 1
          return a.name.localeCompare(b.name)
        })

        resolve(items)
      })
    })

    const breadcrumbs = this.generateBreadcrumbs(normalizedPath)

    return {
      items: files,
      currentPath: normalizedPath,
      breadcrumbs
    }
  }

  // Generate breadcrumb navigation
  private generateBreadcrumbs(dirPath: string): ServerBreadcrumb[] {
    const breadcrumbs: ServerBreadcrumb[] = [{ name: '/', path: '/' }]

    if (dirPath === '/') return breadcrumbs

    const parts = dirPath.split('/').filter(Boolean)
    let currentPath = ''

    for (const part of parts) {
      currentPath += '/' + part
      breadcrumbs.push({ name: part, path: currentPath })
    }

    return breadcrumbs
  }

  // Read file content (with size limit)
  async readFile(filePath: string, maxSize: number = 5 * 1024 * 1024): Promise<FileContentResult> {
    const sftp = await this.getSFTP()

    const stats = await new Promise<{ size: number }>((resolve, reject) => {
      sftp.stat(filePath, (err, stats) => {
        if (err) reject(err)
        else resolve({ size: stats.size })
      })
    })

    if (stats.size > maxSize) {
      throw new Error(
        `File too large (${(stats.size / 1024 / 1024).toFixed(2)} MB). Maximum allowed: ${(maxSize / 1024 / 1024).toFixed(2)} MB`
      )
    }

    const content = await new Promise<string>((resolve, reject) => {
      const readStream = sftp.createReadStream(filePath)
      const chunks: Buffer[] = []

      readStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      readStream.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve(buffer.toString('utf-8'))
      })

      readStream.on('error', reject)
    })

    return {
      content,
      path: filePath,
      size: stats.size,
      encoding: 'utf-8'
    }
  }

  // Write file content
  async writeFile(filePath: string, content: string): Promise<void> {
    const sftp = await this.getSFTP()

    await new Promise<void>((resolve, reject) => {
      const writeStream = sftp.createWriteStream(filePath)

      writeStream.on('close', () => resolve())
      writeStream.on('error', reject)

      writeStream.write(content, 'utf-8')
      writeStream.end()
    })
  }

  // Create directory
  async createDirectory(dirPath: string): Promise<void> {
    const sftp = await this.getSFTP()

    await new Promise<void>((resolve, reject) => {
      sftp.mkdir(dirPath, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  // Delete file
  async deleteFile(filePath: string): Promise<void> {
    const sftp = await this.getSFTP()

    await new Promise<void>((resolve, reject) => {
      sftp.unlink(filePath, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  // Delete directory (must be empty)
  async deleteDirectory(dirPath: string): Promise<void> {
    const sftp = await this.getSFTP()

    await new Promise<void>((resolve, reject) => {
      sftp.rmdir(dirPath, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  // Delete directory recursively using SSH command
  async deleteDirectoryRecursive(dirPath: string): Promise<void> {
    const config = this.getServerConfig()
    if (!config) throw new Error('Server configuration not found')

    const client = new SSHClient()

    await new Promise<void>((resolve, reject) => {
      client.on('ready', () => {
        client.exec(`rm -rf "${dirPath}"`, (err, stream) => {
          if (err) {
            client.end()
            reject(err)
            return
          }

          stream.on('close', (code: number) => {
            client.end()
            if (code === 0) resolve()
            else reject(new Error(`Delete failed with exit code ${code}`))
          })
        })
      })

      client.on('error', reject)

      client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password
      })
    })
  }

  // Rename/move file or directory
  async rename(oldPath: string, newPath: string): Promise<void> {
    const sftp = await this.getSFTP()

    await new Promise<void>((resolve, reject) => {
      sftp.rename(oldPath, newPath, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  // Upload file
  async uploadFile(localPath: string, remotePath: string): Promise<void> {
    const sftp = await this.getSFTP()

    await new Promise<void>((resolve, reject) => {
      const readStream = fs.createReadStream(localPath)
      const writeStream = sftp.createWriteStream(remotePath)

      writeStream.on('close', () => resolve())
      writeStream.on('error', reject)
      readStream.on('error', reject)

      readStream.pipe(writeStream)
    })
  }

  // Download file
  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    const sftp = await this.getSFTP()

    await new Promise<void>((resolve, reject) => {
      const readStream = sftp.createReadStream(remotePath)
      const writeStream = fs.createWriteStream(localPath)

      writeStream.on('close', () => resolve())
      writeStream.on('error', reject)
      readStream.on('error', reject)

      readStream.pipe(writeStream)
    })
  }

  // Get file stream for download
  async getFileStream(
    remotePath: string
  ): Promise<{ stream: NodeJS.ReadableStream; size: number }> {
    const sftp = await this.getSFTP()

    const stats = await new Promise<{ size: number }>((resolve, reject) => {
      sftp.stat(remotePath, (err, stats) => {
        if (err) reject(err)
        else resolve({ size: stats.size })
      })
    })

    const stream = sftp.createReadStream(remotePath)
    return { stream, size: stats.size }
  }

  // ==================== Terminal Management ====================

  // Create terminal session
  async createTerminalSession(ws: WebSocket): Promise<TerminalSession> {
    const config = this.getServerConfig()
    if (!config) {
      throw new Error('Server configuration not found')
    }

    const sessionId = `terminal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const client = new SSHClient()

    const session: TerminalSession = {
      id: sessionId,
      connected: false,
      createdAt: Date.now()
    }

    const activeTerminal: ActiveTerminal = {
      session,
      client,
      channel: null,
      ws
    }

    this.terminals.set(sessionId, activeTerminal)

    // Handle WebSocket close
    ws.on('close', () => {
      this.closeTerminalSession(sessionId)
    })

    // Connect SSH
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end()
        reject(new Error('Connection timeout'))
      }, 30000)

      client.on('ready', () => {
        clearTimeout(timeout)
        session.connected = true
        resolve()
      })

      client.on('error', err => {
        clearTimeout(timeout)
        reject(err)
      })

      client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password
      })
    })

    // Create shell
    const channel = await new Promise<ClientChannel>((resolve, reject) => {
      client.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err, stream) => {
        if (err) reject(err)
        else resolve(stream)
      })
    })

    activeTerminal.channel = channel

    // Forward terminal data to WebSocket
    channel.on('data', (data: Buffer) => {
      if (ws.readyState === 1) {
        const message: TerminalMessage = {
          type: 'terminal:data',
          sessionId,
          data: data.toString('utf-8')
        }
        ws.send(JSON.stringify(message))
      }
    })

    channel.on('close', () => {
      this.closeTerminalSession(sessionId)
    })

    return session
  }

  // Handle terminal input from WebSocket
  handleTerminalInput(sessionId: string, data: string): void {
    const terminal = this.terminals.get(sessionId)
    if (terminal?.channel) {
      terminal.channel.write(data)
    }
  }

  // Resize terminal
  resizeTerminal(sessionId: string, cols: number, rows: number): void {
    const terminal = this.terminals.get(sessionId)
    if (terminal?.channel) {
      terminal.channel.setWindow(rows, cols, 0, 0)
    }
  }

  // Close terminal session
  closeTerminalSession(sessionId: string): void {
    const terminal = this.terminals.get(sessionId)
    if (terminal) {
      if (terminal.channel) {
        terminal.channel.end()
      }
      terminal.client.end()
      terminal.session.connected = false
      this.terminals.delete(sessionId)

      // Notify WebSocket
      if (terminal.ws.readyState === 1) {
        const message: TerminalMessage = {
          type: 'terminal:disconnect',
          sessionId
        }
        terminal.ws.send(JSON.stringify(message))
      }
    }
  }

  // Get terminal session
  getTerminalSession(sessionId: string): TerminalSession | null {
    const terminal = this.terminals.get(sessionId)
    return terminal?.session || null
  }

  // Check if terminal session exists
  hasTerminalSession(sessionId: string): boolean {
    return this.terminals.has(sessionId)
  }

  // Execute SSH command and return result
  async executeCommand(command: string, timeout: number = 120000): Promise<CommandResult> {
    const config = this.getServerConfig()
    if (!config) throw new Error('Server configuration not found')

    const client = new SSHClient()

    return new Promise<CommandResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        client.end()
        reject(new Error('Command execution timeout'))
      }, timeout)

      client.on('ready', () => {
        client.exec(command, (err, stream) => {
          if (err) {
            clearTimeout(timeoutId)
            client.end()
            reject(err)
            return
          }

          let stdout = ''
          let stderr = ''

          stream.on('data', (data: Buffer) => {
            stdout += data.toString()
          })

          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString()
          })

          stream.on('close', (code: number) => {
            clearTimeout(timeoutId)
            client.end()
            resolve({
              success: code === 0,
              output: stdout + stderr,
              exitCode: code
            })
          })
        })
      })

      client.on('error', err => {
        clearTimeout(timeoutId)
        reject(err)
      })

      client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password
      })
    })
  }
}

export const serverService = new ServerService()
