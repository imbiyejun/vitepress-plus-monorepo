import type { ProviderInfo, AIProviderConfig, ChatMessage } from '../types/chat.js'

interface StreamChoice {
  delta: { content?: string; role?: string }
  finish_reason: string | null
}

interface StreamChunk {
  id: string
  choices: StreamChoice[]
}

// Provider definitions (same order as AI chat menu)
const PROVIDER_DEFS: Record<
  string,
  { label: string; defaultBaseUrl: string; defaultModel: string }
> = {
  deepseek: {
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat'
  },
  qwen: {
    label: '通义千问',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus'
  },
  kimi: {
    label: 'Kimi',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k'
  }
}

// Provider priority order (same as AI chat menu)
const PROVIDER_ORDER = ['deepseek', 'qwen', 'kimi']

class TranslateService {
  private getProviderConfig(providerId: string): AIProviderConfig | null {
    const def = PROVIDER_DEFS[providerId]
    if (!def) return null

    const prefix = providerId.toUpperCase()
    const apiKey = process.env[`${prefix}_API_KEY`] || ''
    if (!apiKey) return null

    const baseUrl = process.env[`${prefix}_BASE_URL`] || def.defaultBaseUrl
    const model = process.env[`${prefix}_MODEL`] || def.defaultModel

    return { apiKey, baseUrl, model }
  }

  getConfiguredProviders(): ProviderInfo[] {
    return PROVIDER_ORDER.map(id => {
      const def = PROVIDER_DEFS[id]
      const config = this.getProviderConfig(id)
      return {
        id,
        label: def.label,
        configured: !!config,
        models: [],
        defaultModel: def.defaultModel
      }
    }).filter(p => p.configured)
  }

  // Non-streaming API call for translation
  private async callProvider(config: AIProviderConfig, text: string): Promise<string> {
    const systemPrompt = `You are a translation assistant. Translate the given Chinese text to English, then convert it to a URL slug format.

Rules:
1. Translate the Chinese text to English
2. Convert to lowercase
3. Replace spaces with hyphens
4. Remove special characters (keep only letters, numbers, and hyphens)
5. Keep it concise (1-4 words if possible)
6. If text is already English, just convert to slug format
7. Return ONLY the slug, nothing else

Examples:
- "前端开发" -> "frontend-development"
- "Vue" -> "vue"
- "Vue 入门指南" -> "vue-getting-started"
- "React 组件库" -> "react-components"
- "JavaScript 基础" -> "javascript-basics"`

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ]

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed (${response.status}): ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response stream')

    const decoder = new TextDecoder()
    let buffer = ''
    let result = ''

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
        if (data === '[DONE]') break

        try {
          const parsed: StreamChunk = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content || ''
          if (content) result += content
        } catch {
          // skip malformed chunks
        }
      }
    }

    return this.cleanSlug(result)
  }

  // Normalize slug format
  private cleanSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  // Try each provider in order until one succeeds
  async translate(text: string): Promise<string> {
    const providers = this.getConfiguredProviders()
    if (providers.length === 0) {
      throw new Error('No AI provider configured. Set at least one *_API_KEY in .env')
    }

    let lastError: Error | null = null

    for (const provider of providers) {
      const config = this.getProviderConfig(provider.id)
      if (!config) continue

      try {
        const slug = await this.callProvider(config, text)
        if (slug) return slug
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(`Translation failed with ${provider.label}:`, lastError.message)
      }
    }

    throw lastError || new Error('All providers failed')
  }
}

export const translateService = new TranslateService()
