import type { Request, Response } from 'express'
import { chatService } from '../../services/chatService.js'
import { noteService } from '../../services/noteService.js'
import type { ChatCompletionRequest } from '../../types/chat.js'

export const getChatStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = chatService.getChatStatus()
    res.json({ success: true, data: status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ success: false, error: msg })
  }
}

export const getProviders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const providers = chatService.getProviderInfoList()
    res.json({ success: true, data: { providers } })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ success: false, error: msg })
  }
}

export const listConversations = async (_req: Request, res: Response): Promise<void> => {
  try {
    const conversations = chatService.listConversations()
    res.json({ success: true, data: { conversations } })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ success: false, error: msg })
  }
}

export const getConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const conversation = chatService.getConversation(id)
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' })
      return
    }
    res.json({ success: true, data: conversation })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ success: false, error: msg })
  }
}

export const deleteConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const deleted = chatService.deleteConversation(id)
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Conversation not found' })
      return
    }
    res.json({ success: true, message: 'Conversation deleted' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ success: false, error: msg })
  }
}

export const updateConversationTitle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { title } = req.body as { title: string }
    if (!title) {
      res.status(400).json({ success: false, error: 'Title is required' })
      return
    }
    const conversation = chatService.updateConversationTitle(id, title)
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' })
      return
    }
    res.json({ success: true, data: conversation })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ success: false, error: msg })
  }
}

// SSE streaming endpoint
export const chatCompletion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId, message, provider, model } = req.body as ChatCompletionRequest

    if (!message) {
      res.status(400).json({ success: false, error: 'Message is required' })
      return
    }

    const status = chatService.getChatStatus()
    if (!status.configured) {
      res.status(400).json({
        success: false,
        error: 'No AI provider configured. Set at least one *_API_KEY in .env'
      })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const { conversationId: convId, tokenUsage } = await chatService.chat(
      conversationId,
      message,
      provider,
      model,
      chunk => {
        if (!chunk.done) {
          res.write(`data: ${JSON.stringify({ content: chunk.content, done: false })}\n\n`)
        }
      }
    )

    const conv = chatService.getConversation(convId)
    res.write(
      `data: ${JSON.stringify({
        content: '',
        done: true,
        conversationId: convId,
        tokenUsage,
        totalTokens: conv?.totalTokens || 0
      })}\n\n`
    )
    res.end()
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: msg, done: true })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ success: false, error: msg })
    }
  }
}

// SSE endpoint: generate learning note from conversation
export const generateNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.body as { conversationId?: string }

    if (!conversationId) {
      res.status(400).json({ success: false, error: 'conversationId is required' })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    await noteService.generateNote(conversationId, event => {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    })

    res.end()
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ step: 'error', message: msg })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ success: false, error: msg })
    }
  }
}
