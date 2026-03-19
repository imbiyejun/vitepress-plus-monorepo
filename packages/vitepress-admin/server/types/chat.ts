export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
  timestamp?: number
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  provider: string
  model: string
  createdAt: number
  updatedAt: number
}

// Per-provider env config
export interface ProviderEnvConfig {
  id: string
  label: string
  apiKey: string
  baseUrl: string
  models: string[]
  defaultModel: string
}

export interface ChatStatusResponse {
  configured: boolean
  providers: ProviderInfo[]
  activeProvider: string
  activeModel: string
}

export interface ProviderInfo {
  id: string
  label: string
  configured: boolean
  models: string[]
  defaultModel: string
}

export interface ChatCompletionRequest {
  conversationId?: string
  message: string
  provider?: string
  model?: string
}

export interface ChatCompletionChunk {
  id: string
  content: string
  done: boolean
}

export interface AIProviderConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export interface AIProvider {
  name: string
  chat(
    messages: ChatMessage[],
    model: string,
    onChunk: (chunk: ChatCompletionChunk) => void
  ): Promise<void>
}
