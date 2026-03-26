export type ChatRole = 'system' | 'user' | 'assistant'

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ChatMessage {
  role: ChatRole
  content: string
  timestamp?: number
  tokenUsage?: TokenUsage
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  provider: string
  model: string
  createdAt: number
  updatedAt: number
  totalTokens: number
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

export interface ModelTokenLimit {
  model: string
  maxTokens: number
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
  modelTokenLimits: ModelTokenLimit[]
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
  usage?: TokenUsage
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

// Note generation
export interface GenerateNoteRequest {
  conversationId: string
}

export interface NoteClassification {
  categoryTitle: string
  categorySlug: string
  topicName: string
  topicSlug: string
  topicDescription: string
  articleTitle: string
  articleSlug: string
  articleDescription: string
}

export type NoteProgressStep =
  | 'analyzing'
  | 'classified'
  | 'generating'
  | 'saving'
  | 'done'
  | 'error'

export interface NoteProgressEvent {
  step: NoteProgressStep
  message?: string
  content?: string
  classification?: NoteClassification
  filePath?: string
}
