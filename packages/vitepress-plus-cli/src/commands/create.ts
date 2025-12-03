import { Command } from 'commander'
import { existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface CreateOptions {
  force?: boolean
}

export function createCommand(): Command {
  const create = new Command('create')

  create
    .description('Create a new VitePress Plus project')
    .argument('<project-name>', 'Project name (required)')
    .option('-f, --force', 'Overwrite target directory if it exists', false)
    .action(async (projectName: string, options: CreateOptions) => {
      const { force = false } = options

      console.log('\n🚀 Creating VitePress Plus project...\n')
      console.log(`📦 Project name: ${projectName}`)
      console.log('-------------------\n')

      // Get target directory
      const targetDir = resolve(process.cwd(), projectName)

      // Check if directory exists
      if (existsSync(targetDir)) {
        if (!force) {
          console.error(`❌ Error: Directory "${projectName}" already exists.`)
          console.log('Use --force to overwrite.\n')
          process.exit(1)
        }
        console.log('⚠️  Overwriting existing directory...\n')
      }

      // Get template source directory (from vitepress-plus package)
      const templateDir = resolve(__dirname, '../../../vitepress-plus')

      if (!existsSync(templateDir)) {
        console.error('❌ Error: Template directory not found.')
        console.error(`Expected path: ${templateDir}\n`)
        process.exit(1)
      }

      // Create target directory
      try {
        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true })
        }

        // Copy files
        console.log('📋 Copying files...\n')
        copyDirectory(templateDir, targetDir)

        console.log('✅ Project created successfully!\n')
        console.log('Next steps:')
        console.log(`  cd ${projectName}`)
        console.log('  pnpm install')
        console.log('  pnpm run dev\n')
      } catch (error) {
        console.error('❌ Error creating project:', error)
        process.exit(1)
      }
    })

  return create
}

// Copy directory recursively, excluding node_modules and .git
function copyDirectory(src: string, dest: string): void {
  const excludeDirs = ['node_modules', '.git', 'dist']

  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true })
  }

  const entries = readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    // Get relative path from template root
    const relativePath = srcPath.replace(src, '').replace(/^[\\\/]/, '')
    
    // Skip excluded directories
    if (excludeDirs.some(excluded => relativePath.startsWith(excluded))) {
      continue
    }

    // Skip .vitepress/cache directory and its contents
    if (relativePath.includes('.vitepress\\cache') || relativePath.includes('.vitepress/cache')) {
      continue
    }

    // Skip .vitepress/dist directory
    if (relativePath.includes('.vitepress\\dist') || relativePath.includes('.vitepress/dist')) {
      continue
    }

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath)
    } else if (entry.isFile()) {
      // Skip hidden files except .gitignore, .env.example
      if (entry.name.startsWith('.') && 
          entry.name !== '.gitignore' && 
          entry.name !== '.env.example') {
        continue
      }
      
      copyFileSync(srcPath, destPath)
      console.log(`  ✓ ${relativePath}`)
    }
  }
}

