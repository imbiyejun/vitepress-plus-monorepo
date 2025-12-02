// Topic controller for VitePress Admin
import type { Request, Response } from 'express'
import type { FileSystemService } from '../services/fileSystem.js'

export function createTopicController(fileSystem: FileSystemService) {
  return {
    /**
     * Get all topics config
     */
    async getTopics(_req: Request, res: Response) {
      try {
        const topics = await fileSystem.readTopicsConfig()
        res.json({ success: true, data: topics })
      } catch (error: any) {
        console.error('Failed to get topics:', error)
        res.status(500).json({ success: false, error: error.message })
      }
    },

    /**
     * Update topics config
     */
    async updateTopics(req: Request, res: Response) {
      try {
        const topics = req.body
        await fileSystem.writeTopicsConfig(topics)
        res.json({ success: true, message: 'Topics updated successfully' })
      } catch (error: any) {
        console.error('Failed to update topics:', error)
        res.status(500).json({ success: false, error: error.message })
      }
    },

    /**
     * Get topics data
     */
    async getTopicsData(_req: Request, res: Response) {
      try {
        const topicsData = await fileSystem.readTopicsData()
        res.json({ success: true, data: topicsData })
      } catch (error: any) {
        console.error('Failed to get topics data:', error)
        res.status(500).json({ success: false, error: error.message })
      }
    },

    /**
     * Update topics data
     */
    async updateTopicsData(req: Request, res: Response) {
      try {
        const topicsData = req.body
        await fileSystem.writeTopicsData(topicsData)
        res.json({ success: true, message: 'Topics data updated successfully' })
      } catch (error: any) {
        console.error('Failed to update topics data:', error)
        res.status(500).json({ success: false, error: error.message })
      }
    }
  }
}

