#!/usr/bin/env node

// VitePress Plus CLI
import { Command } from 'commander'
import { create } from '../dist/commands/create.js'
import { init } from '../dist/commands/init.js'

const program = new Command()

program
  .name('vp-plus')
  .description('VitePress Plus CLI - Scaffolding tool for VitePress Plus projects')
  .version('0.1.0')

// Create command
program
  .command('create <project-name>')
  .description('Create a new VitePress Plus project')
  .option('-t, --template <type>', 'Template type (basic/full)', 'basic')
  .option('--admin', 'Install VitePress Admin')
  .option('-i, --install', 'Install dependencies automatically')
  .option('--git', 'Initialize git repository')
  .action(async (projectName, options) => {
    try {
      await create(projectName, {
        template: options.template,
        admin: options.admin,
        install: options.install,
        git: options.git
      })
    } catch (error) {
      console.error('Failed to create project:', error)
      process.exit(1)
    }
  })

// Init command
program
  .command('init')
  .description('Initialize VitePress Plus in existing project')
  .option('-f, --force', 'Force overwrite existing files')
  .action(async (options) => {
    try {
      await init({
        force: options.force
      })
    } catch (error) {
      console.error('Failed to initialize:', error)
      process.exit(1)
    }
  })

// Info command
program
  .command('info')
  .description('Display project information')
  .action(async () => {
    console.log('\n📊 VitePress Plus CLI\n')
    console.log('Version: 0.1.0')
    console.log('Node:', process.version)
    console.log('Platform:', process.platform)
    console.log('')
    console.log('Available commands:')
    console.log('  create  - Create a new project')
    console.log('  init    - Initialize in existing project')
    console.log('  info    - Display this information')
    console.log('')
  })

program.parse()
