import type { Request, Response } from 'express'
import { softwareService } from '../../services/softwareService.js'
import type { SoftwareAction } from '../../types/server.js'

export const getSoftwareStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const software = await softwareService.checkAllSoftware()
    res.json({ software })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const executeSoftwareAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { softwareId, action } = req.body as { softwareId: string; action: SoftwareAction }
    if (!softwareId || !action) {
      res.status(400).json({ error: 'Missing softwareId or action' })
      return
    }
    if (!['install', 'uninstall', 'upgrade'].includes(action)) {
      res.status(400).json({ error: 'Invalid action' })
      return
    }
    const taskId = await softwareService.executeSoftwareAction(softwareId, action)
    res.json({ taskId })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const getSoftwareTask = async (_req: Request, res: Response): Promise<void> => {
  try {
    const task = softwareService.getCurrentTask()
    res.json({ task })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const getSoftwareConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { softwareId, configPath } = req.query as { softwareId: string; configPath: string }
    if (!softwareId || !configPath) {
      res.status(400).json({ error: 'Missing softwareId or configPath' })
      return
    }
    const result = await softwareService.getConfig(softwareId, configPath)
    res.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}

export const updateSoftwareConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { softwareId, configPath, content } = req.body as {
      softwareId: string
      configPath: string
      content: string
    }
    if (!softwareId || !configPath || content === undefined) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }
    await softwareService.updateConfig(softwareId, configPath, content)
    res.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
}
