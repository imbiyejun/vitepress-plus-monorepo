// Init command for VitePress Plus CLI
import { writeFile, access } from 'node:fs/promises'
import { existsSync } from 'node:fs'

export interface InitOptions {
  force?: boolean
}

/**
 * Initialize VitePress Plus in existing project
 */
export async function init(options: InitOptions) {
  console.log('\n🔧 Initializing VitePress Plus...\n')
  
  try {
    // Create vitepress-plus.config.js
    const configContent = `// VitePress Plus configuration
export default {
  vitepressPlus: {
    // Path configuration
    paths: {
      docs: './docs',
      articles: './docs/articles',
      topics: './docs/.vitepress/topics',
      public: './docs/public',
      images: './docs/public/images'
    },

    // Topics feature configuration
    topics: {
      enabled: true,
      autoGenerateNav: true,
      autoGenerateSidebar: true
    },

    // Article status configuration
    articleStatus: {
      enabled: true,
      showInSidebar: true,
      showInPage: false
    }
  },

  // Native VitePress configuration
  vitepress: {
    title: 'My Docs',
    description: 'My documentation site'
  }
}
`
    
    const configFile = 'vitepress-plus.config.js'
    
    // Check if config exists
    if (!options.force && existsSync(configFile)) {
      console.log(`✗ ${configFile} already exists (use --force to overwrite)`)
    } else {
      await writeFile(configFile, configContent, 'utf-8')
      console.log(`✓ Created ${configFile}`)
    }
    
    // Create .gitignore if not exists
    const gitignoreContent = `node_modules/
dist/
.vitepress/cache/
.vitepress/dist/
.DS_Store
*.log
.env
`
    
    const gitignoreFile = '.gitignore'
    
    if (!existsSync(gitignoreFile)) {
      await writeFile(gitignoreFile, gitignoreContent, 'utf-8')
      console.log(`✓ Created ${gitignoreFile}`)
    }
    
    console.log('\n✅ Initialization complete!\n')
    console.log('Next steps:')
    console.log('  1. Review vitepress-plus.config.js')
    console.log('  2. Install dependencies: pnpm add @imbiyejun/vitepress-plus')
    console.log('  3. Start development: pnpm dev')
    console.log('')
    
  } catch (error) {
    console.error('\n✗ Failed to initialize:', error)
    process.exit(1)
  }
}

