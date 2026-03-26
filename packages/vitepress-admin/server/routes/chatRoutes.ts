import express from 'express'
import {
  getChatStatus,
  getProviders,
  listConversations,
  getConversation,
  deleteConversation,
  updateConversationTitle,
  chatCompletion,
  generateNote
} from '../controllers/chat/index.js'

const router: express.Router = express.Router()

router.get('/status', getChatStatus)
router.get('/providers', getProviders)
router.get('/conversations', listConversations)
router.get('/conversations/:id', getConversation)
router.delete('/conversations/:id', deleteConversation)
router.put('/conversations/:id/title', updateConversationTitle)
router.post('/completions', chatCompletion)
router.post('/notes/generate', generateNote)

export default router
