import type {
  AIProvider,
  AIProviderConfig,
  ChatMessage,
  ChatCompletionChunk,
  Conversation,
  ProviderEnvConfig,
  ProviderInfo,
  ChatStatusResponse,
  TokenUsage,
  ModelTokenLimit
} from '../types/chat.js'
import { loadConversations, saveConversations, flushSave } from './chatStorage.js'

// OpenAI-compatible streaming response types (DeepSeek, Qwen, Kimi all use this)
interface StreamChoice {
  delta: { content?: string; role?: string }
  finish_reason: string | null
}

interface StreamUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

interface StreamChunk {
  id: string
  choices: StreamChoice[]
  usage?: StreamUsage
}

// Known model context-window sizes (tokens)
const MODEL_TOKEN_LIMITS: Record<string, number> = {
  'deepseek-chat': 65536,
  'deepseek-reasoner': 65536,
  'qwen-plus': 131072,
  'qwen-turbo': 131072,
  'qwen-max': 32768,
  'qwen-long': 10000000,
  'moonshot-v1-8k': 8192,
  'moonshot-v1-32k': 32768,
  'moonshot-v1-128k': 131072
}

// Rough token estimator: ~1.5 chars/token for CJK, ~4 chars/token for latin
export function estimateTokens(text: string): number {
  let cjk = 0
  let latin = 0
  for (const ch of text) {
    if (ch.charCodeAt(0) > 0x2e80) cjk++
    else latin++
  }
  return Math.ceil(cjk / 1.5 + latin / 4)
}

export function getModelMaxTokens(model: string): number {
  return MODEL_TOKEN_LIMITS[model] || 65536
}

export function getModelTokenLimits(models: string[]): ModelTokenLimit[] {
  return models.map(m => ({ model: m, maxTokens: MODEL_TOKEN_LIMITS[m] || 65536 }))
}

// All three providers use OpenAI-compatible API format
class OpenAICompatibleProvider implements AIProvider {
  name: string
  private config: AIProviderConfig

  constructor(name: string, config: AIProviderConfig) {
    this.name = name
    this.config = config
  }

  async chat(
    messages: ChatMessage[],
    model: string,
    onChunk: (chunk: ChatCompletionChunk) => void
  ): Promise<void> {
    const payload = {
      model: model || this.config.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      stream_options: { include_usage: true }
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed (${response.status}): ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response stream')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') {
          onChunk({ id: '', content: '', done: true })
          return
        }

        try {
          const parsed: StreamChunk = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content || ''

          // Extract usage from final chunk if provider supports it
          let usage: TokenUsage | undefined
          if (parsed.usage) {
            usage = {
              promptTokens: parsed.usage.prompt_tokens || 0,
              completionTokens: parsed.usage.completion_tokens || 0,
              totalTokens: parsed.usage.total_tokens || 0
            }
          }

          if (content || usage) {
            onChunk({ id: parsed.id, content: content || '', done: false, usage })
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    onChunk({ id: '', content: '', done: true })
  }
}

// Built-in provider definitions: env prefix -> label, default baseUrl, default models
const PROVIDER_DEFS: Record<
  string,
  { label: string; defaultBaseUrl: string; defaultModels: string[]; defaultModel: string }
> = {
  deepseek: {
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat'
  },
  qwen: {
    label: '通义千问',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModels: ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen-long'],
    defaultModel: 'qwen-plus'
  },
  kimi: {
    label: 'Kimi',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModels: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    defaultModel: 'moonshot-v1-8k'
  }
}

class ChatService {
  private conversations = new Map<string, Conversation>()
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return
    this.conversations = await loadConversations()
    this.initialized = true
  }

  private persist(): void {
    saveConversations(this.conversations)
  }

  // Read env config for a specific provider
  private getProviderEnvConfig(providerId: string): ProviderEnvConfig | null {
    const def = PROVIDER_DEFS[providerId]
    if (!def) return null

    const prefix = providerId.toUpperCase()
    const apiKey = process.env[`${prefix}_API_KEY`] || ''
    const baseUrl = process.env[`${prefix}_BASE_URL`] || def.defaultBaseUrl
    const modelsEnv = process.env[`${prefix}_MODELS`]
    const models = modelsEnv ? modelsEnv.split(',').map(m => m.trim()) : def.defaultModels
    const defaultModel = process.env[`${prefix}_MODEL`] || def.defaultModel

    return { id: providerId, label: def.label, apiKey, baseUrl, models, defaultModel }
  }

  getProviderInfoList(): ProviderInfo[] {
    return Object.keys(PROVIDER_DEFS).map(id => {
      const cfg = this.getProviderEnvConfig(id)
      if (!cfg)
        return {
          id,
          label: id,
          configured: false,
          models: [],
          defaultModel: '',
          modelTokenLimits: []
        }
      return {
        id,
        label: cfg.label,
        configured: !!cfg.apiKey,
        models: cfg.models,
        defaultModel: cfg.defaultModel,
        modelTokenLimits: getModelTokenLimits(cfg.models)
      }
    })
  }

  getChatStatus(): ChatStatusResponse {
    const providers = this.getProviderInfoList()
    const configured = providers.some(p => p.configured)
    const firstConfigured = providers.find(p => p.configured)
    return {
      configured,
      providers,
      activeProvider: firstConfigured?.id || '',
      activeModel: firstConfigured?.defaultModel || ''
    }
  }

  private getProvider(providerId: string): AIProvider {
    const cfg = this.getProviderEnvConfig(providerId)
    if (!cfg) throw new Error(`Unknown AI provider: ${providerId}`)
    if (!cfg.apiKey)
      throw new Error(
        `${cfg.label} is not configured. Set ${providerId.toUpperCase()}_API_KEY in .env`
      )
    return new OpenAICompatibleProvider(providerId, {
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl,
      model: cfg.defaultModel
    })
  }

  // Resolve which provider/model to use for a request
  private resolveProviderAndModel(
    requestProvider?: string,
    requestModel?: string
  ): { providerId: string; model: string } {
    const providers = this.getProviderInfoList()
    const configured = providers.filter(p => p.configured)
    if (configured.length === 0) throw new Error('No AI provider configured')

    const providerId = requestProvider || configured[0].id
    const target = configured.find(p => p.id === providerId)
    if (!target) throw new Error(`Provider ${providerId} is not configured`)

    const model = requestModel || target.defaultModel
    return { providerId, model }
  }

  createConversation(provider: string, model: string, title?: string): Conversation {
    const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const conversation: Conversation = {
      id,
      title: title || 'New Chat',
      messages: [],
      provider,
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalTokens: 0
    }
    this.conversations.set(id, conversation)
    this.persist()
    return conversation
  }

  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id)
  }

  listConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(c => ({ ...c, messages: [] }))
  }

  deleteConversation(id: string): boolean {
    const result = this.conversations.delete(id)
    if (result) this.persist()
    return result
  }

  updateConversationTitle(id: string, title: string): Conversation | undefined {
    const conv = this.conversations.get(id)
    if (conv) {
      conv.title = title
      conv.updatedAt = Date.now()
      this.persist()
    }
    return conv
  }

  async chat(
    conversationId: string | undefined,
    message: string,
    requestProvider?: string,
    requestModel?: string,
    onChunk?: (chunk: ChatCompletionChunk) => void
  ): Promise<{ conversationId: string; tokenUsage: TokenUsage }> {
    const { providerId, model } = this.resolveProviderAndModel(requestProvider, requestModel)

    let conv: Conversation
    if (conversationId && this.conversations.has(conversationId)) {
      conv = this.conversations.get(conversationId) as Conversation
      conv.provider = providerId
      conv.model = model
    } else {
      conv = this.createConversation(providerId, model)
    }

    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: Date.now() }
    conv.messages.push(userMsg)
    conv.updatedAt = Date.now()

    if (conv.messages.filter(m => m.role === 'user').length === 1) {
      conv.title = message.slice(0, 30) + (message.length > 30 ? '...' : '')
    }

    const provider = this.getProvider(providerId)
    let assistantContent = ''
    let streamUsage: TokenUsage | undefined

    await provider.chat(conv.messages, model, chunk => {
      if (!chunk.done) {
        assistantContent += chunk.content
        if (chunk.usage) streamUsage = chunk.usage
      }
      onChunk?.(chunk)
    })

    // Use API-reported usage or fall back to estimation
    const turnUsage: TokenUsage = streamUsage || {
      promptTokens: conv.messages.reduce((s, m) => s + estimateTokens(m.content), 0),
      completionTokens: estimateTokens(assistantContent),
      totalTokens: 0
    }
    if (!streamUsage) {
      turnUsage.totalTokens = turnUsage.promptTokens + turnUsage.completionTokens
    }

    userMsg.tokenUsage = turnUsage

    conv.messages.push({
      role: 'assistant',
      content: assistantContent,
      timestamp: Date.now(),
      tokenUsage: turnUsage
    })
    conv.totalTokens += turnUsage.totalTokens
    conv.updatedAt = Date.now()
    this.persist()

    return { conversationId: conv.id, tokenUsage: turnUsage }
  }
}

export const chatService = new ChatService()

export { flushSave as flushChatStorage }
