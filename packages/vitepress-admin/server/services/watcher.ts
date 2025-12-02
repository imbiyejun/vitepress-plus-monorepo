import { watch } from 'chokidar'
import { join } from 'path'
import { WebSocket } from 'ws'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..', '..', '..')
const TOPICS_DIR = join(PROJECT_ROOT, 'docs', 'topics')
const TOPICS_CONFIG_DIR = join(PROJECT_ROOT, 'docs', '.vitepress', 'topics', 'config')
const TOPICS_DATA_DIR = join(PROJECT_ROOT, 'docs', '.vitepress', 'topics', 'data')

class FileWatcher {
  private watcher: ReturnType<typeof watch> | null = null
  private clients: Set<WebSocket> = new Set()

  constructor() {
    this.initWatcher()
  }

  private initWatcher() {
    // 监听多个目录
    const watchPaths = [TOPICS_DIR, TOPICS_CONFIG_DIR, TOPICS_DATA_DIR]

    this.watcher = watch(watchPaths, {
      ignored: /(^|[/\\])\../, // 忽略隐藏文件
      persistent: true
    })

    this.watcher
      .on('change', (path: string) => this.handleFileChange('change', path))
      .on('add', (path: string) => this.handleFileChange('add', path))
      .on('unlink', (path: string) => this.handleFileChange('unlink', path))

    const now = new Date().toLocaleString()
    console.log(`[${now}] 开始监听目录:`)
    watchPaths.forEach(path => {
      console.log(`- ${path}`)
    })
  }

  private handleFileChange(event: string, path: string) {
    // 获取相对于项目根目录的路径
    const relativePath = path
      .replace(PROJECT_ROOT, '')
      .replace(/^[/\\]/, '')
      .replace(/\\/g, '/') // 统一使用正斜杠

    const message = JSON.stringify(
      {
        type: event,
        path: relativePath,
        timestamp: new Date().toISOString()
      },
      null,
      2
    )

    const now = new Date().toLocaleString()
    console.log(`[${now}] 文件变化:`)
    console.log(message)
    console.log('-------------------')

    this.broadcast(message)
  }

  public addClient(client: WebSocket) {
    this.clients.add(client)
    const now = new Date().toLocaleString()
    console.log(`[${now}] 新的客户端连接, 当前客户端数量: ${this.clients.size}`)

    client.on('close', () => {
      this.clients.delete(client)
      const now = new Date().toLocaleString()
      console.log(`[${now}] 客户端断开连接, 当前客户端数量: ${this.clients.size}`)
    })
  }

  private broadcast(message: string) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }

  public close() {
    if (this.watcher) {
      this.watcher.close()
    }
    this.clients.forEach(client => client.close())
    this.clients.clear()
    const now = new Date().toLocaleString()
    console.log(`[${now}] 文件监听器已关闭`)
  }
}

export const fileWatcher = new FileWatcher()
