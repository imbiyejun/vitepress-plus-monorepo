import { existsSync, rmSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { copyTemplate } from '../src/utils/copy-template.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const sourceDir = resolve(__dirname, '../../vitepress-plus')
const targetDir = resolve(__dirname, '../template')

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

  console.log(`\n✅ Template prepared successfully!`)
  console.log(`📊 Copied ${copiedCount} files (${skippedCount} files ignored)\n`)
} catch (error) {
  console.error('❌ Error preparing template:', error)
  process.exit(1)
}
