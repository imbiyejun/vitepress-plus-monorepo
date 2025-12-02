import { ref } from 'vue'

const WS_URL = `ws://${window.location.host}`

export class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectTimer: number | null = null
  private readonly maxReconnectAttempts = 5
  private reconnectAttempts = 0

  // 连接状态
  public isConnected = ref(false)

  // 消息处理回调
  private messageHandlers: Set<(data: unknown) => void> = new Set()

  constructor() {
    this.connect()
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(WS_URL)

    this.ws.onopen = () => {
      console.log('WebSocket连接已建立')
      this.isConnected.value = true
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data)
        this.messageHandlers.forEach(handler => handler(data))
      } catch (error) {
        console.error('解析WebSocket消息失败:', error)
      }
    }

    this.ws.onclose = () => {
      console.log('WebSocket连接已关闭')
      this.isConnected.value = false
      this.handleReconnect()
    }

    this.ws.onerror = error => {
      console.error('WebSocket错误:', error)
      this.isConnected.value = false
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('达到最大重连次数，停止重连')
      return
    }

    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
    }

    this.reconnectTimer = window.setTimeout(() => {
      console.log(`尝试重连... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)
      this.reconnectAttempts++
      this.connect()
    }, 3000)
  }

  public onMessage(handler: (data: unknown) => void) {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  public close() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
    }
    if (this.ws) {
      this.ws.close()
    }
    this.messageHandlers.clear()
  }
}

// 导出单例
export const wsService = new WebSocketService()
