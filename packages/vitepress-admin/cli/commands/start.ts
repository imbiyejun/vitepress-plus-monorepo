import { Command } from 'commander'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import open from 'open'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface StartOptions {
  port?: string
  open?: boolean
  root?: string
}

export function startCommand(): Command {
  const start = new Command('start')

  start
    .description('Start VitePress Admin development server')
    .option('-p, --port <port>', 'Server port', '3000')
    .option('-o, --open', 'Open browser automatically', false)
    .option('-r, --root <root>', 'Project root directory', process.cwd())
    .action(async (options: StartOptions) => {
      const { port = '3000', open: shouldOpen = false, root = process.cwd() } = options

      console.log('\n🚀 Starting VitePress Admin...\n')
      console.log(`📁 Project root: ${root}`)
      console.log(`🌐 Server port: ${port}`)
      console.log('-------------------\n')

      // Server path (Vite is integrated as Express middleware)
      const packageRoot = path.resolve(__dirname, '../..')
      const serverPath = path.join(packageRoot, 'server/index.ts')
      
      // Start server with integrated Vite
      const serverProcess = spawn(
        'npx',
        ['tsx', serverPath],
        {
          stdio: 'inherit',
          shell: true,
          env: {
            ...process.env,
            PORT: port,
            PROJECT_ROOT: root,
            NODE_ENV: 'development'
          },
          cwd: packageRoot
        }
      )

      // Handle process termination
      const cleanup = () => {
        console.log('\n\n👋 Shutting down VitePress Admin...')
        serverProcess.kill()
        process.exit(0)
      }

      process.on('SIGINT', cleanup)
      process.on('SIGTERM', cleanup)

      // Open browser after delay
      if (shouldOpen) {
        setTimeout(async () => {
          try {
            await open(`http://localhost:${port}`)
            console.log('🌐 Browser opened automatically')
          } catch (error) {
            console.error('Failed to open browser:', error)
          }
        }, 3000)
      }

      // Handle server errors
      serverProcess.on('error', (error) => {
        console.error('❌ Server error:', error)
        cleanup()
      })
    })

  return start
}

