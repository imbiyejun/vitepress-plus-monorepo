import { Router } from 'express'
import type { Router as ExpressRouter } from 'express'
import {
  getTopicArticleList,
  getArticleContent,
  updateArticleContent
} from '../controllers/articleController.js'

const router: ExpressRouter = Router()

// Get article list for a topic
router.get('/topics/:topicId/articles', getTopicArticleList)

// Get article content
router.get('/articles/:topicSlug/:articleSlug', getArticleContent)

// Update article content
router.put('/articles/:topicSlug/:articleSlug', updateArticleContent)

export default router
