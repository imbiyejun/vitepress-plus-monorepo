import { Command } from 'commander'
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { copyTemplate } from '../utils/copy-template.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface CreateOptions {
  force?: boolean
}

interface PackageJson {
  name: string
  version: string
  [key: string]: unknown
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
        // Remove existing directory
        rmSync(targetDir, { recursive: true, force: true })
      }

      // Get template source directory
      // When published as npm package, template is in the package root
      // During development (monorepo), it's in the sibling vitepress-plus directory
      let templateDir = resolve(__dirname, '../../template')

      // Fallback to monorepo structure for development
      if (!existsSync(templateDir)) {
        templateDir = resolve(__dirname, '../../../vitepress-plus')
      }

      if (!existsSync(templateDir)) {
        console.error('❌ Error: Template directory not found.')
        console.error(`Expected path: ${templateDir}\n`)
        process.exit(1)
      }

      // Create target directory
      try {
        mkdirSync(targetDir, { recursive: true })

        // Copy template files with gitignore support
        console.log('📋 Copying template files...\n')

        let copiedCount = 0
        let skippedCount = 0

        copyTemplate({
          source: templateDir,
          target: targetDir,
          onFileCopied: relativePath => {
            console.log(`  ✓ ${relativePath}`)
            copiedCount++
          },
          onFileSkipped: () => {
            // Only log skipped files in verbose mode
            skippedCount++
          }
        })

        console.log(`\n📦 Copied ${copiedCount} files (${skippedCount} files ignored)\n`)

        // Update package.json with project name
        updatePackageJson(targetDir, projectName)

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

/**
 * Update package.json with the new project name
 */
function updatePackageJson(targetDir: string, projectName: string): void {
  const packageJsonPath = resolve(targetDir, 'package.json')

  if (!existsSync(packageJsonPath)) {
    console.warn('⚠️  Warning: package.json not found in template')
    return
  }

  try {
    const content = readFileSync(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content) as PackageJson

    // Update package name
    packageJson.name = projectName
    packageJson.version = '0.1.0'

    // Remove private flag if exists
    delete packageJson['private']

    // Remove workspace dependencies
    if (packageJson.dependencies && typeof packageJson.dependencies === 'object') {
      const deps = packageJson.dependencies as Record<string, string>
      for (const [key, value] of Object.entries(deps)) {
        if (value.startsWith('workspace:')) {
          // Convert workspace dependency to latest version
          deps[key] = '^0.1.0'
        }
      }
    }

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8')

    console.log('📝 Updated package.json with project name\n')
  } catch (error) {
    console.warn('⚠️  Warning: Could not update package.json:', error)
  }
}
