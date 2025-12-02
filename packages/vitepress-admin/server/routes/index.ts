// Main router for VitePress Admin API
import { Router } from 'express'
import type { FileSystemService } from '../services/fileSystem.js'
import { createTopicController } from '../controllers/topicController.js'
import { createArticleController } from '../controllers/articleController.js'

export function createApiRouter(fileSystem: FileSystemService): Router {
  const router = Router()
  
  // Create controllers
  const topicController = createTopicController(fileSystem)
  const articleController = createArticleController(fileSystem)
  
  // Topics routes
  router.get('/topics', topicController.getTopics)
  router.post('/topics', topicController.updateTopics)
  router.get('/topics/data', topicController.getTopicsData)
  router.post('/topics/data', topicController.updateTopicsData)
  
  // Articles routes
  router.get('/articles/:topicSlug', articleController.getArticles)
  router.get('/articles/:topicSlug/:articleSlug', articleController.getArticle)
  router.post('/articles/:topicSlug/:articleSlug', articleController.saveArticle)
  router.delete('/articles/:topicSlug/:articleSlug', articleController.deleteArticle)
  router.patch('/articles/:topicSlug/:articleSlug/rename', articleController.renameArticle)
  
  return router
}

