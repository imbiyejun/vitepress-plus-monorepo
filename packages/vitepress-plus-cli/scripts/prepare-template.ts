import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { copyTemplate } from '../src/utils/copy-template.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const sourceDir = resolve(__dirname, '../../vitepress-plus')
const targetDir = resolve(__dirname, '../template')
const adminPackagePath = resolve(__dirname, '../../vitepress-admin/package.json')

console.log('📦 Preparing template for packaging...\n')
console.log(`Source: ${sourceDir}`)
console.log(`Target: ${targetDir}\n`)

// Remove existing template directory
if (existsSync(targetDir)) {
  console.log('🗑️  Removing existing template directory...\n')
  rmSync(targetDir, { recursive: true, force: true })
}

// Create template directory
mkdirSync(targetDir, { recursive: true })

// Copy template files
let copiedCount = 0
let skippedCount = 0

try {
  copyTemplate({
    source: sourceDir,
    target: targetDir,
    onFileCopied: relativePath => {
      console.log(`  ✓ ${relativePath}`)
      copiedCount++
    },
    onFileSkipped: (_relativePath, _reason) => {
      skippedCount++
    }
  })

  // Replace workspace:* with actual version in template package.json
  const templatePackagePath = resolve(targetDir, 'package.json')
  if (existsSync(templatePackagePath) && existsSync(adminPackagePath)) {
    const templatePackage: { dependencies?: Record<string, string> } = JSON.parse(
      readFileSync(templatePackagePath, 'utf-8')
    )
    const adminPackage: { version: string } = JSON.parse(readFileSync(adminPackagePath, 'utf-8'))

    const adminVersion = adminPackage.version

    if (templatePackage.dependencies?.['@imbiyejun/vitepress-admin'] === 'workspace:*') {
      templatePackage.dependencies['@imbiyejun/vitepress-admin'] = adminVersion
      writeFileSync(templatePackagePath, JSON.stringify(templatePackage, null, 2) + '\n', 'utf-8')
      console.log(`\n🔄 Replaced workspace:* with version ${adminVersion}`)
    }
  }

  console.log(`\n✅ Template prepared successfully!`)
  console.log(`📊 Copied ${copiedCount} files (${skippedCount} files ignored)\n`)
} catch (error) {
  console.error('❌ Error preparing template:', error)
  process.exit(1)
}
