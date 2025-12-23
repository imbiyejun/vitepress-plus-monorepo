#!/usr/bin/env node

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Determine whether to use source or built files
const useSource = process.env.DEBUG_SOURCE === 'true'
const distExists = existsSync(join(__dirname, '../dist/cli/index.js'))

if (useSource || !distExists) {
  // Use source files with tsx
  console.log('🔧 Debug mode: running from source files')

  const cliPath = join(__dirname, '../cli/index.ts')

  // Use pnpm exec tsx to run TypeScript directly
  const isWindows = process.platform === 'win32'
  const command = isWindows ? 'pnpm.cmd' : 'pnpm'

  const child = spawn(command, ['exec', 'tsx', cliPath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env
    // Don't set cwd, keep current working directory
  })

  child.on('exit', code => {
    process.exit(code || 0)
  })
} else {
  // Use built files
  const { createCLI } = await import('../dist/cli/index.js')
  const program = createCLI()
  program.parse(process.argv)
}
