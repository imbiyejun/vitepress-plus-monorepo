import { onMounted, onUnmounted } from 'vue'
import { wsService } from '../services/websocket'
import { useTopics } from './useTopics'

export interface FileChangeEvent {
  type: 'change' | 'add' | 'unlink'
  path: string
  timestamp: string
}

export function useFileWatch() {
  const { refreshTopics } = useTopics()

  let unsubscribe: (() => void) | null = null

  const handleFileChange = async (event: FileChangeEvent) => {
    console.log('文件变化:', event)

    // 根据文件类型刷新不同的数据
    if (
      event.path.startsWith('topics/') ||
      event.path.includes('.vitepress/topics/data/') ||
      event.path.includes('.vitepress/topics/config/')
    ) {
      console.log('检测到专题数据变化，刷新数据...')
      await refreshTopics()
    }
  }

  onMounted(() => {
    // 订阅文件变化事件
    unsubscribe = wsService.onMessage((data: unknown) => {
      // Type guard to ensure data is FileChangeEvent
      if (
        data &&
        typeof data === 'object' &&
        'type' in data &&
        'path' in data &&
        'timestamp' in data
      ) {
        handleFileChange(data as FileChangeEvent)
      }
    })
  })

  onUnmounted(() => {
    // 取消订阅
    if (unsubscribe) {
      unsubscribe()
    }
  })

  return {
    isConnected: wsService.isConnected
  }
}
