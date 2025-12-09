import { Command } from 'commander'
import { startCommand } from './commands/start.js'

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
