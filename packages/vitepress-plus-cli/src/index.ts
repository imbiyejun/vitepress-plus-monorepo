import { Command } from 'commander'
import { createCommand } from './commands/create.js'

export function createCLI(): Command {
  const program = new Command()

  program
    .name('vp-plus')
    .description('VitePress Plus scaffolding tool')
    .version('0.1.0')

  // Register commands
  program.addCommand(createCommand())

  return program
}

