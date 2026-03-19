import type {
  AIProvider,
  AIProviderConfig,
  ChatMessage,
  ChatCompletionChunk,
  Conversation,
  ProviderEnvConfig,
  ProviderInfo,
  ChatStatusResponse
} from '../types/chat.js'

// OpenAI-compatible streaming response types (DeepSeek, Qwen, Kimi all use this)
interface StreamChoice {
  delta: { content?: string; role?: string }
  finish_reason: string | null
}

interface StreamChunk {
  id: string
  choices: StreamChoice[]
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
      stream: true
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
          if (content) {
            onChunk({ id: parsed.id, content, done: false })
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
      if (!cfg) return { id, label: id, configured: false, models: [], defaultModel: '' }
      return {
        id,
        label: cfg.label,
        configured: !!cfg.apiKey,
        models: cfg.models,
        defaultModel: cfg.defaultModel
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
      updatedAt: Date.now()
    }
    this.conversations.set(id, conversation)
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
    return this.conversations.delete(id)
  }

  updateConversationTitle(id: string, title: string): Conversation | undefined {
    const conv = this.conversations.get(id)
    if (conv) {
      conv.title = title
      conv.updatedAt = Date.now()
    }
    return conv
  }

  async chat(
    conversationId: string | undefined,
    message: string,
    requestProvider?: string,
    requestModel?: string,
    onChunk?: (chunk: ChatCompletionChunk) => void
  ): Promise<{ conversationId: string }> {
    const { providerId, model } = this.resolveProviderAndModel(requestProvider, requestModel)

    let conv: Conversation
    if (conversationId && this.conversations.has(conversationId)) {
      conv = this.conversations.get(conversationId) as Conversation
      conv.provider = providerId
      conv.model = model
    } else {
      conv = this.createConversation(providerId, model)
    }

    conv.messages.push({ role: 'user', content: message, timestamp: Date.now() })
    conv.updatedAt = Date.now()

    if (conv.messages.filter(m => m.role === 'user').length === 1) {
      conv.title = message.slice(0, 30) + (message.length > 30 ? '...' : '')
    }

    const provider = this.getProvider(providerId)
    let assistantContent = ''

    await provider.chat(conv.messages, model, chunk => {
      if (!chunk.done) {
        assistantContent += chunk.content
      }
      onChunk?.(chunk)
    })

    conv.messages.push({
      role: 'assistant',
      content: assistantContent,
      timestamp: Date.now()
    })
    conv.updatedAt = Date.now()

    return { conversationId: conv.id }
  }
}

export const chatService = new ChatService()
