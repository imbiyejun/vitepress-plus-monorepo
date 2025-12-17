import { Command } from 'commander'
import { startCommand } from './commands/start.js'
import { fileURLToPath } from 'url'

// CLI entry point
export function createCLI(): Command {
  const program = new Command()

  program
    .name('vpa')
    .description('VitePress Admin - Local development tool for managing VitePress Plus projects')
    .version('0.1.0')

  // Register commands
  program.addCommand(startCommand())

  return program
}

// Execute CLI only when run directly (not imported)
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  fileURLToPath(import.meta.url) === process.argv[1]

if (isMainModule) {
  const program = createCLI()
  program.parse(process.argv)
}
