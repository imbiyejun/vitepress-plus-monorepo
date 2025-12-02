// File system service for VitePress Admin
import { readFile, writeFile, mkdir, readdir, stat, unlink, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, basename, dirname } from 'node:path'
import matter from 'gray-matter'
import type { PathResolver } from '../utils/pathResolver.js'
import type { TopicCategory, TopicItem, Topic, Article, TopicsData } from '../types/common.js'

export class FileSystemService {
  constructor(private pathResolver: PathResolver) {}

  /**
   * Read topics config from file
   */
  async readTopicsConfig(): Promise<TopicCategory[]> {
    try {
      const configPath = join(this.pathResolver.getTopicsConfigDir(), 'index.ts')
      
      if (!existsSync(configPath)) {
        return []
      }
      
      // Dynamic import for TypeScript files
      const fileURL = this.pathToFileURL(configPath)
      const module = await import(fileURL + '?t=' + Date.now())
      return module.topics || []
    } catch (error) {
      console.error('Failed to read topics config:', error)
      return []
    }
  }

  /**
   * Write topics config to file
   */
  async writeTopicsConfig(topics: TopicCategory[]): Promise<void> {
    const configPath = join(this.pathResolver.getTopicsConfigDir(), 'index.ts')
    const content = this.generateTopicsConfigContent(topics)
    
    // Ensure directory exists
    await mkdir(dirname(configPath), { recursive: true })
    await writeFile(configPath, content, 'utf-8')
  }

  /**
   * Read topics data from file
   */
  async readTopicsData(): Promise<TopicsData> {
    try {
      const dataPath = join(this.pathResolver.getTopicsDataDir(), 'index.ts')
      
      if (!existsSync(dataPath)) {
        return {}
      }
      
      const fileURL = this.pathToFileURL(dataPath)
      const module = await import(fileURL + '?t=' + Date.now())
      return module.topicsData || {}
    } catch (error) {
      console.error('Failed to read topics data:', error)
      return {}
    }
  }

  /**
   * Write topics data to file
   */
  async writeTopicsData(topicsData: TopicsData): Promise<void> {
    const dataPath = join(this.pathResolver.getTopicsDataDir(), 'index.ts')
    const content = this.generateTopicsDataContent(topicsData)
    
    await mkdir(dirname(dataPath), { recursive: true })
    await writeFile(dataPath, content, 'utf-8')
  }

  /**
   * Read article file
   */
  async readArticle(topicSlug: string, articleSlug: string): Promise<Article | null> {
    try {
      const articlePath = join(
        this.pathResolver.getArticlesDir(),
        topicSlug,
        `${articleSlug}.md`
      )
      
      if (!existsSync(articlePath)) {
        return null
      }
      
      const content = await readFile(articlePath, 'utf-8')
      const { data, content: body } = matter(content)
      
      return {
        id: data.id || articleSlug,
        slug: articleSlug,
        title: data.title || articleSlug,
        summary: data.summary || '',
        status: data.status || 'draft',
        date: data.date,
        topicId: topicSlug
      }
    } catch (error) {
      console.error('Failed to read article:', error)
      return null
    }
  }

  /**
   * Write article file
   */
  async writeArticle(topicSlug: string, articleSlug: string, article: Article, content: string): Promise<void> {
    const articlePath = join(
      this.pathResolver.getArticlesDir(),
      topicSlug,
      `${articleSlug}.md`
    )
    
    const frontMatter = {
      title: article.title,
      date: article.date || new Date().toISOString().split('T')[0],
      status: article.status,
      summary: article.summary
    }
    
    const fileContent = matter.stringify(content, frontMatter)
    
    await mkdir(dirname(articlePath), { recursive: true })
    await writeFile(articlePath, fileContent, 'utf-8')
  }

  /**
   * List articles in a topic directory
   */
  async listArticles(topicSlug: string): Promise<Article[]> {
    try {
      const topicDir = join(this.pathResolver.getArticlesDir(), topicSlug)
      
      if (!existsSync(topicDir)) {
        return []
      }
      
      const files = await readdir(topicDir)
      const articles: Article[] = []
      
      for (const file of files) {
        if (extname(file) === '.md') {
          const slug = basename(file, '.md')
          const article = await this.readArticle(topicSlug, slug)
          if (article) {
            articles.push(article)
          }
        }
      }
      
      return articles
    } catch (error) {
      console.error('Failed to list articles:', error)
      return []
    }
  }

  /**
   * Delete article file
   */
  async deleteArticle(topicSlug: string, articleSlug: string): Promise<void> {
    const articlePath = join(
      this.pathResolver.getArticlesDir(),
      topicSlug,
      `${articleSlug}.md`
    )
    
    if (existsSync(articlePath)) {
      await unlink(articlePath)
    }
  }

  /**
   * Rename article file
   */
  async renameArticle(topicSlug: string, oldSlug: string, newSlug: string): Promise<void> {
    const oldPath = join(this.pathResolver.getArticlesDir(), topicSlug, `${oldSlug}.md`)
    const newPath = join(this.pathResolver.getArticlesDir(), topicSlug, `${newSlug}.md`)
    
    if (existsSync(oldPath)) {
      await rename(oldPath, newPath)
    }
  }

  /**
   * List images in directory
   */
  async listImages(subDir: string = ''): Promise<string[]> {
    try {
      const imagesDir = join(this.pathResolver.getImagesDir(), subDir)
      
      if (!existsSync(imagesDir)) {
        return []
      }
      
      const files = await readdir(imagesDir)
      const images: string[] = []
      
      for (const file of files) {
        const filePath = join(imagesDir, file)
        const stats = await stat(filePath)
        
        if (stats.isFile() && this.isImageFile(file)) {
          images.push(join(subDir, file).replace(/\\/g, '/'))
        }
      }
      
      return images
    } catch (error) {
      console.error('Failed to list images:', error)
      return []
    }
  }

  /**
   * Generate topics config file content
   */
  private generateTopicsConfigContent(topics: TopicCategory[]): string {
    return `import { TopicCategory } from './types.js'

export const topics: TopicCategory[] = ${JSON.stringify(topics, null, 2)}

export * from './types.js'
`
  }

  /**
   * Generate topics data file content
   */
  private generateTopicsDataContent(topicsData: TopicsData): string {
    const imports: string[] = []
    const exports: string[] = []
    
    Object.keys(topicsData).forEach(key => {
      const varName = `${key}Topic`
      imports.push(`import { ${varName} } from './${key}/index.js'`)
      exports.push(`  ${key}: ${varName}`)
    })
    
    return `${imports.join('\n')}
import type { TopicsData } from './types.js'

export const topicsData: TopicsData = {
${exports.join(',\n')}
}

export type { Article, Chapter, Topic, TopicsData } from './types.js'
`
  }

  /**
   * Convert Windows path to file URL
   */
  private pathToFileURL(path: string): string {
    if (process.platform === 'win32') {
      return 'file:///' + path.replace(/\\/g, '/')
    }
    return 'file://' + path
  }

  /**
   * Check if file is an image
   */
  private isImageFile(filename: string): boolean {
    const ext = extname(filename).toLowerCase()
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)
  }
}

