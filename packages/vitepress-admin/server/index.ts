// VitePress Admin server entry point
import express from 'express'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadConfig } from '../config/index.js'
import { PathResolver } from './utils/pathResolver.js'
import { FileSystemService } from './services/fileSystem.js'
import { createApiRouter } from './routes/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface ServerOptions {
  port?: string
  config?: string
  open?: boolean
}

/**
 * Start VitePress Admin server
 */
export async function startServer(options: ServerOptions = {}) {
  try {
    // Load configuration
    console.log('Loading configuration...')
    const config = await loadConfig(options.config ? dirname(options.config) : process.cwd())
    
    // Override port if provided
    if (options.port) {
      config.server.port = parseInt(options.port)
    }
    
    console.log(`Server configuration loaded`)
    console.log(`- Port: ${config.server.port}`)
    console.log(`- Project root: ${config.project.root}`)
    
    // Initialize services
    const pathResolver = new PathResolver(config)
    const fileSystem = new FileSystemService(pathResolver)
    
    // Create Express app
    const app = express()
    
    // Middleware
    app.use(express.json({ limit: '50mb' }))
    app.use(express.urlencoded({ extended: true, limit: '50mb' }))
    
    // CORS for development
    app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      next()
    })
    
    // Static files
    app.use('/public', express.static(pathResolver.getPublicDir()))
    
    // API routes
    app.use('/api', createApiRouter(fileSystem))
    
    // Health check
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })
    
    // In production, serve frontend build
    if (process.env.NODE_ENV === 'production') {
      const distPath = join(__dirname, '../../dist/client')
      app.use(express.static(distPath))
      app.get('*', (_req, res) => {
        res.sendFile(join(distPath, 'index.html'))
      })
    }
    
    // Create HTTP server
    const server = createServer(app)
    
    // Start listening
    const port = config.server.port
    const host = config.server.host
    
    server.listen(port, host, () => {
      console.log('')
      console.log('✓ VitePress Admin server started successfully!')
      console.log('')
      console.log(`  ➜  Local:   http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/`)
      console.log('')
      console.log('  Press Ctrl+C to stop')
      console.log('')
      
      // Open browser if requested
      if (options.open) {
        const open = import('open')
        open.then(mod => mod.default(`http://localhost:${port}/`))
      }
    })
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server')
      server.close(() => {
        console.log('HTTP server closed')
        process.exit(0)
      })
    })
    
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}
