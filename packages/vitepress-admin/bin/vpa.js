#!/usr/bin/env node

// VitePress Admin CLI
import { Command } from 'commander'
import { startServer } from '../dist/server/index.js'

const program = new Command()

program
  .name('vpa')
  .description('VitePress Admin - Local development tool for managing VitePress Plus projects')
  .version('0.1.0')

// Start command
program
  .command('start')
  .description('Start the admin server')
  .option('-p, --port <port>', 'Port to run on', '3000')
  .option('-c, --config <path>', 'Config file path')
  .option('-o, --open', 'Open browser automatically')
  .action(async (options) => {
    try {
      await startServer({
        port: options.port,
        config: options.config,
        open: options.open
      })
    } catch (error) {
      console.error('Failed to start server:', error)
      process.exit(1)
    }
  })

// Init command
program
  .command('init')
  .description('Initialize VPA configuration files')
  .option('-f, --force', 'Force overwrite existing files')
  .action(async (options) => {
    console.log('Creating configuration files...')
    
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    
    // Create vpa.config.js
    const configContent = `// VitePress Admin configuration
export default {
  server: {
    port: 3000,
    host: 'localhost'
  },
  project: {
    root: './',
    docsDir: './docs',
    articlesDir: './docs/articles',
    topicsConfigDir: './docs/.vitepress/topics/config',
    topicsDataDir: './docs/.vitepress/topics/data',
    publicDir: './docs/public',
    imagesDir: './docs/public/images'
  },
  image: {
    localStorage: {
      enabled: true,
      path: './docs/public/images',
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    }
  },
  watch: {
    enabled: true,
    debounce: 300,
    ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**']
  }
}
`
    
    // Create .env.example
    const envContent = `# VitePress Admin Environment Variables

# Server
VPA_PORT=3000
VPA_HOST=localhost

# Local Storage
VPA_LOCAL_STORAGE_PATH=docs/public/images

# Qiniu Cloud Storage (Optional)
# VPA_QINIU_ACCESS_KEY=your_access_key
# VPA_QINIU_SECRET_KEY=your_secret_key
# VPA_QINIU_BUCKET=your_bucket
# VPA_QINIU_DOMAIN=cdn.yourdomain.com
`
    
    try {
      const configPath = 'vpa.config.js'
      const envPath = '.env.example'
      
      // Write vpa.config.js
      if (options.force || !(await fs.access(configPath).then(() => true).catch(() => false))) {
        await fs.writeFile(configPath, configContent, 'utf-8')
        console.log('✓ Created vpa.config.js')
      } else {
        console.log('✗ vpa.config.js already exists (use --force to overwrite)')
      }
      
      // Write .env.example
      if (options.force || !(await fs.access(envPath).then(() => true).catch(() => false))) {
        await fs.writeFile(envPath, envContent, 'utf-8')
        console.log('✓ Created .env.example')
      } else {
        console.log('✗ .env.example already exists (use --force to overwrite)')
      }
      
      console.log('')
      console.log('Next steps:')
      console.log('  1. Copy .env.example to .env and configure if needed')
      console.log('  2. Run: vpa start')
      console.log('')
    } catch (error) {
      console.error('Failed to create config files:', error)
      process.exit(1)
    }
  })

// Validate command
program
  .command('validate')
  .description('Validate configuration')
  .option('-c, --config <path>', 'Config file path')
  .action(async (options) => {
    try {
      const { loadConfig, validateConfig } = await import('../dist/config/index.js')
      
      console.log('Loading configuration...')
      const config = await loadConfig(options.config ? path.dirname(options.config) : process.cwd())
      
      console.log('Validating configuration...')
      const result = validateConfig(config)
      
      if (result.valid) {
        console.log('✓ Configuration is valid')
        console.log('')
        console.log('Configuration summary:')
        console.log(`  Server: http://${config.server.host}:${config.server.port}`)
        console.log(`  Project root: ${config.project.root}`)
        console.log(`  Docs directory: ${config.project.docsDir}`)
      } else {
        console.log('✗ Configuration has errors:')
        result.errors.forEach(error => console.log(`  - ${error}`))
        process.exit(1)
      }
    } catch (error) {
      console.error('Failed to validate config:', error)
      process.exit(1)
    }
  })

program.parse()
