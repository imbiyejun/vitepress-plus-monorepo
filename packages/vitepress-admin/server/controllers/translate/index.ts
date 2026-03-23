import type { Request, Response } from 'express'
import { translateService } from '../../services/translateService.js'
import type { TranslateRequest } from '../../types/translate.js'

export const translateToSlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body as TranslateRequest

    if (!text || !text.trim()) {
      res.status(400).json({ success: false, error: 'Text is required' })
      return
    }

    const slug = await translateService.translate(text.trim())
    res.json({ success: true, data: { slug } })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Translation failed'
    res.status(500).json({ success: false, error: msg })
  }
}
