// Path resolver utility for VitePress Admin
import { resolve, relative, isAbsolute } from 'node:path'
import type { VPAConfig } from '../../config/types.js'

export class PathResolver {
  private projectRoot: string
  private config: VPAConfig

  constructor(config: VPAConfig) {
    this.config = config
    this.projectRoot = resolve(config.project.root)
  }

  /**
   * Get project root directory
   */
  getProjectRoot(): string {
    return this.projectRoot
  }

  /**
   * Get docs directory
   */
  getDocsDir(): string {
    return this.resolve(this.config.project.docsDir)
  }

  /**
   * Get articles directory
   */
  getArticlesDir(): string {
    return this.resolve(this.config.project.articlesDir)
  }

  /**
   * Get topics config directory
   */
  getTopicsConfigDir(): string {
    return this.resolve(this.config.project.topicsConfigDir)
  }

  /**
   * Get topics data directory
   */
  getTopicsDataDir(): string {
    return this.resolve(this.config.project.topicsDataDir)
  }

  /**
   * Get public directory
   */
  getPublicDir(): string {
    return this.resolve(this.config.project.publicDir)
  }

  /**
   * Get images directory
   */
  getImagesDir(): string {
    return this.resolve(this.config.project.imagesDir)
  }

  /**
   * Resolve path relative to project root
   */
  resolve(...paths: string[]): string {
    return resolve(this.projectRoot, ...paths)
  }

  /**
   * Get relative path from project root
   */
  getRelativePath(absolutePath: string): string {
    return relative(this.projectRoot, absolutePath)
  }

  /**
   * Check if path is within project root (security check)
   */
  isPathAllowed(targetPath: string): boolean {
    const absPath = isAbsolute(targetPath) ? targetPath : this.resolve(targetPath)
    const relPath = relative(this.projectRoot, absPath)
    
    // Path should not start with .. (outside project root)
    return !relPath.startsWith('..') && !isAbsolute(relPath)
  }
}

