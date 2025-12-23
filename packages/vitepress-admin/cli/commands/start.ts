import { Command } from 'commander'
import { spawn, type ChildProcess } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
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

      const absoluteRoot = path.resolve(root)

      console.log('\n🚀 Starting VitePress Admin...\n')
      console.log(`📁 Project root: ${absoluteRoot}`)
      console.log(`🌐 Server port: ${port}`)
      console.log('-------------------\n')

      // Check DEBUG_SOURCE env to decide whether to use source or dist
      const useSource = process.env.DEBUG_SOURCE === 'true'

      // Calculate package root based on source or dist mode
      // Source: cli/commands/start.ts -> ../.. -> vitepress-admin
      // Dist: dist/cli/commands/start.js -> ../../.. -> vitepress-admin
      const packageRoot = useSource
        ? path.resolve(__dirname, '../..')
        : path.resolve(__dirname, '../../..')

      let serverPath: string
      let command: string
      let args: string[]

      if (useSource) {
        // Debug mode: use pnpm exec tsx to run source
        serverPath = path.join(packageRoot, 'server/index.ts')

        const isWindows = process.platform === 'win32'
        command = isWindows ? 'pnpm.cmd' : 'pnpm'
        args = ['exec', 'tsx', serverPath]
        console.log('🔧 Debug mode: running from source files')
      } else {
        // Production mode: use compiled dist
        serverPath = path.join(packageRoot, 'dist/server/index.js')

        if (!fs.existsSync(serverPath)) {
          console.error('❌ Error: Compiled server not found.')
          console.error('Please run "pnpm run build" in vitepress-admin package first.')
          console.error('Or set DEBUG_SOURCE=true to run from source files.')
          process.exit(1)
        }

        command = 'node'
        args = [serverPath]
      }

      const serverProcess: ChildProcess = spawn(command, args, {
        stdio: 'inherit',
        shell: false,
        env: {
          ...process.env,
          PORT: port,
          PROJECT_ROOT: absoluteRoot,
          NODE_ENV: useSource ? 'development' : 'production'
        },
        cwd: packageRoot
      })

      // Handle process termination
      const cleanup = (): void => {
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
      serverProcess.on('error', (error: Error) => {
        console.error('❌ Server error:', error)
        cleanup()
      })
    })

  return start
}
