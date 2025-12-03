import { join } from 'path'
import { pathToFileURL } from 'url'
import { getProjectRoot } from '../config/paths.js'
import type { TopicsData } from '../types/topic.js'

/**
 * Dynamically load topics data from the target VitePress Plus project
 */
export async function loadTopicsData(): Promise<TopicsData> {
  try {
    const projectRoot = getProjectRoot()
    
    // Try multiple possible paths for topics data
    const possiblePaths = [
      join(projectRoot, '.vitepress/topics/data/index.ts'),
      join(projectRoot, '.vitepress/topics/data/index.js'),
      join(projectRoot, '.vitepress/topics/data/index.mjs')
    ]
    
    let lastError: Error | null = null
    
    for (const dataPath of possiblePaths) {
      try {
        const dataUrl = pathToFileURL(dataPath).href
        // Add timestamp to bypass cache
        const module = await import(`${dataUrl}?t=${Date.now()}`)
        if (module.topicsData) {
          return module.topicsData
        }
      } catch (error) {
        lastError = error as Error
        // Continue trying other paths
      }
    }
    
    console.warn('Failed to load topics data from any path:', lastError)
    // Return empty object if data file doesn't exist
    return {}
  } catch (error) {
    console.error('Error loading topics data:', error)
    return {}
  }
}

/**
 * Get the path to topics data directory
 */
export function getTopicsDataPath(): string {
  const projectRoot = getProjectRoot()
  return join(projectRoot, '.vitepress/topics/data')
}

/**
 * Get the path to topics config directory
 */
export function getTopicsConfigPath(): string {
  const projectRoot = getProjectRoot()
  return join(projectRoot, '.vitepress/topics/config')
}

/**
 * Get the path to a specific topic data file
 */
export function getTopicDataPath(slug: string): string {
  return join(getTopicsDataPath(), slug)
}

