import { existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync, lstatSync } from 'fs'
import { join, relative, sep } from 'path'
import ignore, { type Ignore } from 'ignore'

export interface CopyOptions {
  /**
   * Source directory to copy from
   */
  source: string
  /**
   * Target directory to copy to
   */
  target: string
  /**
   * Callback function called for each file copied
   */
  onFileCopied?: (relativePath: string) => void
  /**
   * Callback function called for each file/directory skipped
   */
  onFileSkipped?: (relativePath: string, reason: string) => void
}

interface IgnoreFilter {
  ig: Ignore
  gitignorePath: string
}

/**
 * Copy template directory with gitignore support
 */
export function copyTemplate(options: CopyOptions): void {
  const { source, target, onFileCopied, onFileSkipped } = options

  if (!existsSync(source)) {
    throw new Error(`Source directory not found: ${source}`)
  }

  // Create target directory if it doesn't exist
  if (!existsSync(target)) {
    mkdirSync(target, { recursive: true })
  }

  // Parse .gitignore files
  const ignoreFilters = parseGitignoreFiles(source)

  // Copy files recursively
  copyDirectoryRecursive(source, target, source, ignoreFilters, onFileCopied, onFileSkipped)
}

/**
 * Parse all .gitignore files in the directory tree
 */
function parseGitignoreFiles(rootDir: string): IgnoreFilter[] {
  const filters: IgnoreFilter[] = []

  // Add default ignores (always ignore these)
  const defaultIg = ignore()
  defaultIg.add(['node_modules/', '.git/', 'dist/', '.DS_Store', 'Thumbs.db'])
  filters.push({
    ig: defaultIg,
    gitignorePath: rootDir
  })

  // Find and parse .gitignore files
  findGitignoreFiles(rootDir, rootDir, filters)

  return filters
}

/**
 * Recursively find all .gitignore files
 */
function findGitignoreFiles(currentDir: string, rootDir: string, filters: IgnoreFilter[]): void {
  const gitignorePath = join(currentDir, '.gitignore')

  if (existsSync(gitignorePath)) {
    try {
      const content = readFileSync(gitignorePath, 'utf-8')
      const ig = ignore()

      // Parse gitignore content, filter out comments and empty lines
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))

      if (lines.length > 0) {
        ig.add(lines)
        filters.push({
          ig,
          gitignorePath: currentDir
        })
      }
    } catch {
      // Ignore errors reading .gitignore files
      console.warn(`Warning: Could not read .gitignore at ${gitignorePath}`)
    }
  }

  // Don't recurse into ignored directories
  const entries = readdirSync(currentDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory() && !shouldIgnore(entry.name, currentDir, filters)) {
      findGitignoreFiles(join(currentDir, entry.name), rootDir, filters)
    }
  }
}

/**
 * Check if a file/directory should be ignored based on gitignore rules
 */
function shouldIgnore(name: string, currentDir: string, filters: IgnoreFilter[]): boolean {
  const fullPath = join(currentDir, name)

  // Check if path is ignored by any gitignore file
  for (const filter of filters) {
    const filterDir = filter.gitignorePath
    const relativeToFilter = relative(filterDir, fullPath)
    // Normalize path separators to forward slashes for ignore package
    const normalizedRelative = relativeToFilter.split(sep).join('/')

    // Only check if the path is under this gitignore's directory
    if (!normalizedRelative.startsWith('..')) {
      if (filter.ig.ignores(normalizedRelative)) {
        return true
      }
    }
  }

  return false
}

/**
 * Copy directory recursively with ignore support
 */
function copyDirectoryRecursive(
  srcDir: string,
  destDir: string,
  rootDir: string,
  ignoreFilters: IgnoreFilter[],
  onFileCopied?: (relativePath: string) => void,
  onFileSkipped?: (relativePath: string, reason: string) => void
): void {
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }

  const entries = readdirSync(srcDir, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name)
    const destPath = join(destDir, entry.name)
    const relativePath = relative(rootDir, srcPath)

    // Normalize path for display
    const displayPath = relativePath.split(sep).join('/')

    // Skip if ignored
    if (shouldIgnore(entry.name, srcDir, ignoreFilters)) {
      onFileSkipped?.(displayPath, 'gitignore')
      continue
    }

    try {
      const stats = lstatSync(srcPath)

      if (stats.isSymbolicLink()) {
        // Skip symbolic links
        onFileSkipped?.(displayPath, 'symbolic link')
        continue
      }

      if (entry.isDirectory()) {
        copyDirectoryRecursive(
          srcPath,
          destPath,
          rootDir,
          ignoreFilters,
          onFileCopied,
          onFileSkipped
        )
      } else if (entry.isFile()) {
        // Copy file
        copyFileSync(srcPath, destPath)
        onFileCopied?.(displayPath)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      onFileSkipped?.(displayPath, `error: ${errorMessage}`)
    }
  }
}
