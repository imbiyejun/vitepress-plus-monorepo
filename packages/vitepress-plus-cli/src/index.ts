import { Command } from 'commander'
import { createCommand } from './commands/create.js'
import { fileURLToPath } from 'url'

export function createCLI(): Command {
  const program = new Command()

  program.name('vp-plus').description('VitePress Plus scaffolding tool').version('0.1.0')

  // Register commands
  program.addCommand(createCommand())

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
