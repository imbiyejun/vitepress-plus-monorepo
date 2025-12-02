// Article controller for VitePress Admin
import type { Request, Response } from 'express'
import type { FileSystemService } from '../services/fileSystem.js'

export function createArticleController(fileSystem: FileSystemService) {
  return {
    /**
     * Get articles in a topic
     */
    async getArticles(req: Request, res: Response) {
      try {
        const { topicSlug } = req.params
        const articles = await fileSystem.listArticles(topicSlug)
        res.json({ success: true, data: articles })
      } catch (error: any) {
        console.error('Failed to get articles:', error)
        res.status(500).json({ success: false, error: error.message })
      }
    },

    /**
     * Get single article
     */
    async getArticle(req: Request, res: Response) {
      try {
        const { topicSlug, articleSlug } = req.params
        const article = await fileSystem.readArticle(topicSlug, articleSlug)
        
        if (!article) {
          res.status(404).json({ success: false, error: 'Article not found' })
          return
        }
        
        res.json({ success: true, data: article })
      } catch (error: any) {
        console.error('Failed to get article:', error)
        res.status(500).json({ success: false, error: error.message })
      }
    },

    /**
     * Create or update article
     */
    async saveArticle(req: Request, res: Response) {
      try {
        const { topicSlug, articleSlug } = req.params
        const { article, content } = req.body
        
        await fileSystem.writeArticle(topicSlug, articleSlug, article, content)
        res.json({ success: true, message: 'Article saved successfully' })
      } catch (error: any) {
        console.error('Failed to save article:', error)
        res.status(500).json({ success: false, error: error.message })
      }
    },

    /**
     * Delete article
     */
    async deleteArticle(req: Request, res: Response) {
      try {
        const { topicSlug, articleSlug } = req.params
        await fileSystem.deleteArticle(topicSlug, articleSlug)
        res.json({ success: true, message: 'Article deleted successfully' })
      } catch (error: any) {
        console.error('Failed to delete article:', error)
        res.status(500).json({ success: false, error: error.message })
      }
    },

    /**
     * Rename article
     */
    async renameArticle(req: Request, res: Response) {
      try {
        const { topicSlug, articleSlug } = req.params
        const { newSlug } = req.body
        
        await fileSystem.renameArticle(topicSlug, articleSlug, newSlug)
        res.json({ success: true, message: 'Article renamed successfully' })
      } catch (error: any) {
        console.error('Failed to rename article:', error)
        res.status(500).json({ success: false, error: error.message })
      }
    }
  }
}

