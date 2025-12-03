import path from 'path'

/**
 * Get the project root directory
 * Priority: PROJECT_ROOT env var > current working directory
 */
export function getProjectRoot(): string {
  const currentDir = process.cwd()
  
  // Use PROJECT_ROOT if set by CLI (resolve relative paths)
  if (process.env.PROJECT_ROOT) {
    return path.resolve(process.env.PROJECT_ROOT)
  }
  
  // Fallback: if running from admin directory, go up one level
  if (currentDir.endsWith('admin') || currentDir.endsWith('vitepress-admin')) {
    return path.resolve(currentDir, '..')
  }
  
  return currentDir
}

/**
 * Get the public directory path
 * In vitepress-plus, it's at root level: ./public
 * Legacy support for docs/public structure
 */
export function getPublicPath(): string {
  const projectRoot = getProjectRoot()
  
  // Check for VitePress Plus structure (public at root)
  const rootPublic = path.join(projectRoot, 'public')
  
  // For now, default to root public (VitePress Plus structure)
  // Legacy docs/public structure can be added with fs.existsSync checks if needed
  return rootPublic
}

/**
 * Get the articles directory path
 */
export function getArticlesPath(): string {
  const projectRoot = getProjectRoot()
  return path.join(projectRoot, 'articles')
}

/**
 * Get the topics directory path
 */
export function getTopicsPath(): string {
  const projectRoot = getProjectRoot()
  return path.join(projectRoot, 'topics')
}

/**
 * Get the .vitepress directory path
 */
export function getVitePressPath(): string {
  const projectRoot = getProjectRoot()
  return path.join(projectRoot, '.vitepress')
}

/**
 * Get the topics data directory path
 */
export function getTopicsDataPath(): string {
  return path.join(getVitePressPath(), 'topics/data')
}

/**
 * Get the topics config directory path
 */
export function getTopicsConfigPath(): string {
  return path.join(getVitePressPath(), 'topics/config')
}

