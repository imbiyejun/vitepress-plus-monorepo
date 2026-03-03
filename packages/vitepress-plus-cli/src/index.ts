import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { fileURLToPath } from 'url'

export function createCLI(): Command {
  const program = new Command()

  program.name('vpp').description('VitePress Plus scaffolding tool').version('0.1.0')

  // Register commands
  program.addCommand(initCommand())

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
