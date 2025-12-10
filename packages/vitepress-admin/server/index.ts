import dotenv from 'dotenv'
import express, { type Request, type Response, type NextFunction } from 'express'
import { createServer as createHttpServer } from 'http'
import { WebSocketServer, type WebSocket } from 'ws'
import { createServer as createViteServer, type ViteDevServer } from 'vite'
import categoryRoutes from './routes/categoryRoutes.js'
import topicRoutes from './routes/topicRoutes.js'
import imageRoutes from './routes/imageRoutes.js'
import articleRoutes from './routes/articleRoutes.js'
import { fileWatcher } from './services/watcher.js'
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

const app: express.Application = express()
const PORT: number = Number(process.env.PORT) || 3000

console.log('Project root:', projectRoot)
console.log('Environment file:', envPath)

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const now = new Date().toLocaleString()
  const start = Date.now()

  console.log(`[${now}] ${req.method} ${req.url}`)

  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`[${now}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`)
    console.log('-------------------')
  })

  next()
})

// Middleware config
app.use(express.json())

// Static files
const publicPath = path.join(projectRoot, 'public')
console.log('Serving static files from:', publicPath)

app.use(
  express.static(publicPath, {
    setHeaders: (res: Response, filePath: string) => {
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

// Routes
app.use('/api/categories', categoryRoutes)
app.use('/api', topicRoutes)
app.use('/api/images', imageRoutes)
app.use('/api', articleRoutes)

// Integrate Vite in development mode
async function setupVite(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    const vite: ViteDevServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(__dirname, '..')
    })
    app.use(vite.middlewares)
  } else {
    // Production mode: serve static client files from parent dist directory
    const distPath = path.resolve(__dirname, '..')
    console.log('Serving static client files from:', distPath)
    app.use(express.static(distPath))
  }
}

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const now = new Date().toLocaleString()
  console.error(`[${now}] Error:`, err.stack)
  console.log('-------------------')

  if (!res.headersSent) {
    res.status(500).json({ error: '服务器内部错误' })
  }
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error)
})

// Create HTTP server
const server = createHttpServer(app)

// Create WebSocket server
const wss = new WebSocketServer({ server })

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  console.log('新的WebSocket连接')

  fileWatcher.addClient(ws)

  ws.on('error', console.error)
})

// Start server
async function startServer(): Promise<void> {
  await setupVite()

  server.listen(PORT, () => {
    const now = new Date().toLocaleString()
    console.log(`[${now}] 服务器运行在 http://localhost:${PORT}`)
    console.log(`[${now}] WebSocket服务器运行在 ws://localhost:${PORT}`)
    console.log('-------------------')
  })
}

startServer().catch((err: Error) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

export default app
