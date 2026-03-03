import { Command } from 'commander'
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { input, confirm } from '@inquirer/prompts'
import { copyTemplate } from '../utils/copy-template.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DEFAULT_PROJECT_NAME = 'vitepress-plus-docs'

interface PackageJson {
  name: string
  version: string
  [key: string]: unknown
}

export function initCommand(): Command {
  const init = new Command('init')

  init.description('Initialize a new VitePress Plus project').action(async () => {
    // Interactive prompt for project name
    const projectName = await input({
      message: '请输入项目名称:',
      default: DEFAULT_PROJECT_NAME,
      validate: (value: string) => {
        if (!value.trim()) {
          return '项目名称不能为空'
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
          return '项目名称只能包含字母、数字、下划线和连字符'
        }
        return true
      }
    })

    console.log('\n🚀 Creating VitePress Plus project...\n')
    console.log(`📦 Project name: ${projectName}`)
    console.log('-------------------\n')

    const targetDir = resolve(process.cwd(), projectName)

    // Check if directory exists
    if (existsSync(targetDir)) {
      const shouldOverwrite = await confirm({
        message: `目录 "${projectName}" 已存在，是否覆盖?`,
        default: false
      })

      if (!shouldOverwrite) {
        console.log('\n❌ 已取消创建项目\n')
        process.exit(0)
      }

      console.log('\n⚠️  Overwriting existing directory...\n')
      rmSync(targetDir, { recursive: true, force: true })
    }

    // Get template source directory
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

    try {
      mkdirSync(targetDir, { recursive: true })

      console.log('📋 Copying template files...\n')

      let copiedCount = 0
      let skippedCount = 0

      copyTemplate({
        source: templateDir,
        target: targetDir,
        onFileCopied: (relativePath: string) => {
          console.log(`  ✓ ${relativePath}`)
          copiedCount++
        },
        onFileSkipped: () => {
          skippedCount++
        }
      })

      console.log(`\n📦 Copied ${copiedCount} files (${skippedCount} files ignored)\n`)

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

  return init
}

function updatePackageJson(targetDir: string, projectName: string): void {
  const packageJsonPath = resolve(targetDir, 'package.json')

  if (!existsSync(packageJsonPath)) {
    console.warn('⚠️  Warning: package.json not found in template')
    return
  }

  try {
    const content = readFileSync(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content) as PackageJson

    packageJson.name = projectName
    packageJson.version = '0.1.0'

    delete packageJson['private']

    if (packageJson.dependencies && typeof packageJson.dependencies === 'object') {
      const deps = packageJson.dependencies as Record<string, string>
      for (const [key, value] of Object.entries(deps)) {
        if (value.startsWith('workspace:')) {
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
