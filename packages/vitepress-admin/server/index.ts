import dotenv from 'dotenv'
import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { createServer as createViteServer } from 'vite'
import type { ViteDevServer } from 'vite'
import categoryRoutes from './routes/categoryRoutes'
import topicRoutes from './routes/topicRoutes'
import imageRoutes from './routes/imageRoutes'
import articleRoutes from './routes/articleRoutes'
import { fileWatcher } from './services/watcher'
import path from 'path'
import { fileURLToPath } from 'url'
import { getProjectRoot } from './config/paths.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Debug: log environment variables (remove in production)
console.log('Environment variables loaded:')
console.log('LOCAL_STORAGE_PATH:', process.env.LOCAL_STORAGE_PATH)
console.log('QINIU_BUCKET:', process.env.QINIU_BUCKET ? '***' : 'not set')

// Load environment variables from target project root
const projectRoot = getProjectRoot()
const envPath = path.resolve(projectRoot, '.env')
dotenv.config({ path: envPath })

const app = express()
const PORT = process.env.PORT || 3000

console.log('Project root:', projectRoot)
console.log('Environment file:', envPath)

// 请求日志中间件
app.use((req, res, next) => {
  const now = new Date().toLocaleString()
  const start = Date.now()

  // 请求开始时打印
  console.log(`[${now}] ${req.method} ${req.url}`)

  // 响应结束时打印
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`[${now}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`)
    console.log('-------------------')
  })

  next()
})

// 中间件配置
app.use(express.json())

// 静态文件服务
// Serve entire public directory for directory browsing
const publicPath = path.join(projectRoot, 'public')
console.log('Serving static files from:', publicPath)

app.use(
  express.static(publicPath, {
    // 设置正确的 MIME 类型
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png')
      } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg')
      } else if (filePath.endsWith('.gif')) {
        res.setHeader('Content-Type', 'image/gif')
      } else if (filePath.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp')
      } else if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml')
      }
    }
  })
)

// 路由配置
app.use('/api/categories', categoryRoutes)
app.use('/api', topicRoutes) // 添加专题路由
app.use('/api/images', imageRoutes) // 添加图片路由
app.use('/api', articleRoutes) // 添加文章路由

// Integrate Vite in development mode
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite: ViteDevServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(__dirname, '..')
    })
    app.use(vite.middlewares)
  } else {
    // Production mode: serve static files
    app.use(express.static(path.resolve(__dirname, '../dist')))
  }
}

// 错误处理中间件
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const now = new Date().toLocaleString()
  console.error(`[${now}] Error:`, err.stack)
  console.log('-------------------')

  // Prevent sending response if already sent
  if (!res.headersSent) {
    res.status(500).json({ error: '服务器内部错误' })
  }
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  // Don't exit the process, just log the error
})

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error)
  // Don't exit the process, just log the error
})

// 创建HTTP服务器
const server = createServer(app)

// 创建WebSocket服务器
const wss = new WebSocketServer({ server })

// WebSocket连接处理
wss.on('connection', ws => {
  console.log('新的WebSocket连接')

  // 将客户端添加到文件监听器
  fileWatcher.addClient(ws)

  ws.on('error', console.error)
})

// 启动服务器
async function startServer() {
  // Setup Vite middleware
  await setupVite()

  server.listen(PORT, () => {
    const now = new Date().toLocaleString()
    console.log(`[${now}] 服务器运行在 http://localhost:${PORT}`)
    console.log(`[${now}] WebSocket服务器运行在 ws://localhost:${PORT}`)
    console.log('-------------------')
  })
}

startServer().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

export default app
