#!/usr/bin/env node

/**
 * Incremental type checking script
 * Only checks git staged files for faster commits
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { relative, resolve } from 'path'

// Get staged files
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf-8',
      cwd: process.cwd()
    })
    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(file => resolve(process.cwd(), file))
      .filter(file => existsSync(file))
  } catch {
    console.error('❌ Failed to get staged files')
    return []
  }
}

// Categorize files by package
function categorizeFiles(files) {
  const adminFiles = { client: [], server: [], cli: [] }
  const plusFiles = []
  const cliFiles = []

  for (const file of files) {
    const relativePath = relative(process.cwd(), file)

    // Skip non-TS/Vue files
    if (!/(\.ts|\.vue)$/.test(file)) {
      continue
    }

    // Skip config and test files
    if (/\.(config|test|spec)\.ts$/.test(file)) {
      continue
    }

    // Categorize by package
    if (relativePath.startsWith('packages/vitepress-admin/')) {
      const adminRelPath = relativePath.replace('packages/vitepress-admin/', '')
      if (adminRelPath.startsWith('server/')) {
        adminFiles.server.push(adminRelPath)
      } else if (adminRelPath.startsWith('cli/')) {
        adminFiles.cli.push(adminRelPath)
      } else if (adminRelPath.startsWith('src/')) {
        adminFiles.client.push(adminRelPath)
      }
    } else if (relativePath.startsWith('packages/vitepress-plus/')) {
      plusFiles.push(relativePath.replace('packages/vitepress-plus/', ''))
    } else if (relativePath.startsWith('packages/vitepress-plus-cli/')) {
      cliFiles.push(relativePath.replace('packages/vitepress-plus-cli/', ''))
    }
  }

  return { adminFiles, plusFiles, cliFiles }
}

// Run type check for a package
function runTypeCheck(packageName, command, cwd) {
  try {
    execSync(command, {
      encoding: 'utf-8',
      stdio: 'inherit',
      cwd
    })
    console.log(`✅ ${packageName} type check passed`)
    return true
  } catch {
    console.error(`❌ ${packageName} type check failed`)
    return false
  }
}

// Main function
function main() {
  console.log('🚀 Starting incremental type check...\n')

  const stagedFiles = getStagedFiles()

  if (stagedFiles.length === 0) {
    console.log('✅ No staged files to check')
    process.exit(0)
  }

  const { adminFiles, plusFiles, cliFiles } = categorizeFiles(stagedFiles)

  console.log(`📊 File statistics:`)
  console.log(`   - Admin client: ${adminFiles.client.length}`)
  console.log(`   - Admin server: ${adminFiles.server.length}`)
  console.log(`   - Admin CLI: ${adminFiles.cli.length}`)
  console.log(`   - VitePress Plus: ${plusFiles.length}`)
  console.log(`   - CLI: ${cliFiles.length}\n`)

  // If no TS/Vue files need checking
  const totalFiles =
    adminFiles.client.length +
    adminFiles.server.length +
    adminFiles.cli.length +
    plusFiles.length +
    cliFiles.length

  if (totalFiles === 0) {
    console.log('✅ No TypeScript files to check')
    process.exit(0)
  }

  let success = true

  // Check vitepress-admin
  if (adminFiles.client.length > 0 || adminFiles.server.length > 0 || adminFiles.cli.length > 0) {
    console.log('🔍 Checking @imbiyejun/vitepress-admin...')
    success =
      runTypeCheck(
        'vitepress-admin',
        'vue-tsc --noEmit && tsc --project tsconfig.server.json --noEmit && tsc --project tsconfig.cli.json --noEmit',
        resolve(process.cwd(), 'packages/vitepress-admin')
      ) && success
  }

  // Check vitepress-plus
  if (plusFiles.length > 0) {
    console.log('🔍 Checking @imbiyejun/vitepress-plus...')
    success =
      runTypeCheck(
        'vitepress-plus',
        'vue-tsc --noEmit --skipLibCheck',
        resolve(process.cwd(), 'packages/vitepress-plus')
      ) && success
  }

  // Check vitepress-plus-cli
  if (cliFiles.length > 0) {
    console.log('🔍 Checking @imbiyejun/vitepress-plus-cli...')
    success =
      runTypeCheck(
        'vitepress-plus-cli',
        'tsc --noEmit',
        resolve(process.cwd(), 'packages/vitepress-plus-cli')
      ) && success
  }

  if (success) {
    console.log('\n✅ All type checks passed!')
    process.exit(0)
  } else {
    console.log('\n❌ Type check failed, please fix and retry')
    process.exit(1)
  }
}

main()
