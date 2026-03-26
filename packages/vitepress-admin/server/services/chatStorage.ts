import fs from 'fs/promises'
import path from 'path'
import type { Conversation } from '../types/chat.js'
import { getDataPath } from '../config/paths.js'

const CHAT_FILE = 'chat-conversations.json'

interface ChatStorageData {
  version: number
  conversations: Conversation[]
}

function getFilePath(): string {
  return path.join(getDataPath(), CHAT_FILE)
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(getDataPath(), { recursive: true })
}

// Debounce timer to batch rapid writes (e.g. during streaming)
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingData: Map<string, Conversation> | null = null

export async function loadConversations(): Promise<Map<string, Conversation>> {
  const map = new Map<string, Conversation>()
  try {
    const raw = await fs.readFile(getFilePath(), 'utf-8')
    const data: ChatStorageData = JSON.parse(raw)
    if (Array.isArray(data.conversations)) {
      for (const conv of data.conversations) {
        map.set(conv.id, conv)
      }
    }
  } catch {
    // File not found or corrupted — start fresh
  }
  return map
}

export function saveConversations(conversations: Map<string, Conversation>): void {
  pendingData = conversations
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    flushSave()
  }, 500)
}

// Force immediate write (called on graceful shutdown)
export async function flushSave(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (!pendingData) return
  const data: ChatStorageData = {
    version: 1,
    conversations: Array.from(pendingData.values())
  }
  pendingData = null
  try {
    await ensureDir()
    const tmp = getFilePath() + '.tmp'
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
    await fs.rename(tmp, getFilePath())
  } catch (err) {
    console.error('[ChatStorage] Failed to save conversations:', err)
  }
}
