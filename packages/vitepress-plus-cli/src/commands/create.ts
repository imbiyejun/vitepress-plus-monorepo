// Create command for VitePress Plus CLI
import { mkdir, cp, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface CreateOptions {
  template?: 'basic' | 'full'
  admin?: boolean
  install?: boolean
  git?: boolean
}

/**
 * Create a new VitePress Plus project
 */
export async function create(projectName: string, options: CreateOptions) {
  console.log(`\n📦 Creating VitePress Plus project: ${projectName}\n`)
  
  // Check if directory exists
  if (existsSync(projectName)) {
    console.error(`✗ Directory '${projectName}' already exists`)
    process.exit(1)
  }
  
  try {
    // Create project directory
    await mkdir(projectName, { recursive: true })
    console.log(`✓ Created project directory`)
    
    // Copy template files
    const templatePath = join(__dirname, '../../../vitepress-plus/template/docs')
    const targetPath = join(projectName)
    
    console.log(`✓ Copying template files...`)
    await cp(templatePath, targetPath, { recursive: true })
    
    // Create package.json
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'vitepress dev',
        build: 'vitepress build',
        preview: 'vitepress preview'
      },
      dependencies: {
        '@imbiyejun/vitepress-plus': '^0.1.0',
        'ant-design-vue': '^4.0.0',
        'vitepress': '^1.6.3',
        'vue': '^3.4.0'
      }
    }
    
    // Add admin if requested
    if (options.admin) {
      packageJson.scripts['admin:dev'] = 'vpa start'
      packageJson['devDependencies'] = {
        '@imbiyejun/vitepress-admin': '^0.1.0'
      }
    }
    
    await writeFile(
      join(projectName, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    )
    console.log(`✓ Created package.json`)
    
    // Create README
    const readme = `# ${projectName}

A documentation site built with VitePress Plus.

## Getting Started

\`\`\`bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
${options.admin ? '\n# Start admin panel\npnpm admin:dev\n' : ''}
# Build for production
pnpm build
\`\`\`

## Documentation

Visit [VitePress Plus](https://github.com) for documentation.
`
    
    await writeFile(join(projectName, 'README.md'), readme, 'utf-8')
    console.log(`✓ Created README.md`)
    
    // Initialize git if requested
    if (options.git) {
      const { execSync } = await import('node:child_process')
      execSync('git init', { cwd: projectName, stdio: 'ignore' })
      console.log(`✓ Initialized git repository`)
    }
    
    console.log('\n✅ Project created successfully!\n')
    console.log('Next steps:')
    console.log(`  cd ${projectName}`)
    if (options.install) {
      console.log(`  Installing dependencies...`)
      const { execSync } = await import('node:child_process')
      execSync('pnpm install', { cwd: projectName, stdio: 'inherit' })
      console.log('')
    } else {
      console.log(`  pnpm install`)
    }
    console.log(`  pnpm dev`)
    if (options.admin) {
      console.log(`  pnpm admin:dev`)
    }
    console.log('')
    
  } catch (error) {
    console.error('\n✗ Failed to create project:', error)
    process.exit(1)
  }
}

