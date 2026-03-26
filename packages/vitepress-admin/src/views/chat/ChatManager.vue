<template>
  <div class="chat-container">
    <!-- Conversation sidebar -->
    <div class="chat-sidebar">
      <div class="new-chat-wrapper">
        <a-button type="primary" block @click="handleNewChat">
          <PlusOutlined />
          新对话
        </a-button>
      </div>

      <div class="conversation-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          :class="['conversation-item', { active: conv.id === activeConversationId }]"
          @click="handleSelectConversation(conv.id)"
        >
          <MessageOutlined class="conv-icon" />
          <div class="conv-info">
            <span v-if="editingId !== conv.id" class="conv-title">{{ conv.title }}</span>
            <a-input
              v-else
              v-model:value="editingTitle"
              size="small"
              @pressEnter="handleSaveTitle(conv.id)"
              @blur="handleSaveTitle(conv.id)"
              @click.stop
            />
          </div>
          <div class="conv-actions" @click.stop>
            <EditOutlined v-if="editingId !== conv.id" @click="handleEditTitle(conv)" />
            <a-popconfirm title="确认删除？" @confirm="handleDeleteConversation(conv.id)">
              <DeleteOutlined />
            </a-popconfirm>
          </div>
        </div>

        <a-empty v-if="conversations.length === 0" description="暂无对话" :image="false" />
      </div>
    </div>

    <!-- Main chat area -->
    <div class="chat-main">
      <!-- Not configured warning -->
      <a-alert
        v-if="!chatStatus?.configured"
        message="AI 未配置"
        description="请在 .env 文件中设置至少一个 *_API_KEY（如 DEEPSEEK_API_KEY）来启用 Chat 功能"
        type="warning"
        show-icon
        class="config-alert"
      />

      <!-- Messages area -->
      <div class="messages-area" ref="messagesRef">
        <div v-if="messages.length === 0 && !isGeneratingNote" class="empty-chat">
          <RobotOutlined class="empty-icon" />
          <h2>AI 助手</h2>
          <p>选择模型，输入消息开始对话</p>
        </div>

        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="['message-item', `message-${msg.role}`]"
        >
          <div class="message-avatar">
            <a-avatar v-if="msg.role === 'user'" :size="32" class="user-avatar">
              <template #icon><UserOutlined /></template>
            </a-avatar>
            <a-avatar v-else :size="32" class="assistant-avatar">
              <template #icon><RobotOutlined /></template>
            </a-avatar>
          </div>
          <div class="message-content">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="message-bubble" v-html="renderMarkdown(msg.content)" />
            <div v-if="msg.role === 'assistant' && msg.tokenUsage" class="message-token-badge">
              <ThunderboltOutlined />
              {{ formatTokens(msg.tokenUsage.totalTokens) }} tokens
            </div>
          </div>
        </div>

        <!-- Streaming indicator -->
        <div v-if="isStreaming" class="message-item message-assistant">
          <div class="message-avatar">
            <a-avatar :size="32" class="assistant-avatar">
              <template #icon><RobotOutlined /></template>
            </a-avatar>
          </div>
          <div class="message-content">
            <div class="message-bubble streaming-bubble">
              <span v-if="streamingContent">{{ streamingContent }}</span>
              <span v-else class="typing-indicator"> <span /><span /><span /> </span>
            </div>
          </div>
        </div>

        <!-- Note generation progress widget -->
        <div v-if="isGeneratingNote" class="note-progress-widget">
          <div class="note-progress-header">
            <FileTextOutlined />
            <span>生成学习笔记</span>
          </div>

          <!-- Step indicators -->
          <div class="note-steps">
            <div
              :class="['note-step', { active: noteStep === 'analyzing', done: noteStepIndex > 0 }]"
            >
              <LoadingOutlined v-if="noteStep === 'analyzing'" spin />
              <CheckCircleOutlined v-else-if="noteStepIndex > 0" />
              <span v-else class="step-dot" />
              <span>分析对话内容</span>
            </div>
            <div
              :class="['note-step', { active: noteStep === 'classified', done: noteStepIndex > 1 }]"
            >
              <LoadingOutlined v-if="noteStep === 'classified'" spin />
              <CheckCircleOutlined v-else-if="noteStepIndex > 1" />
              <span v-else class="step-dot" />
              <span>自动归类</span>
            </div>
            <div
              :class="['note-step', { active: noteStep === 'generating', done: noteStepIndex > 2 }]"
            >
              <LoadingOutlined v-if="noteStep === 'generating'" spin />
              <CheckCircleOutlined v-else-if="noteStepIndex > 2" />
              <span v-else class="step-dot" />
              <span>生成笔记</span>
            </div>
            <div :class="['note-step', { active: noteStep === 'saving', done: noteStepIndex > 3 }]">
              <LoadingOutlined v-if="noteStep === 'saving'" spin />
              <CheckCircleOutlined v-else-if="noteStepIndex > 3" />
              <span v-else class="step-dot" />
              <span>保存文件</span>
            </div>
          </div>

          <!-- Classification info -->
          <div v-if="noteClassification" class="note-classification">
            <a-tag color="blue">{{ noteClassification.categoryTitle }}</a-tag>
            <a-tag color="green">{{ noteClassification.topicName }}</a-tag>
            <a-tag>{{ noteClassification.articleTitle }}</a-tag>
          </div>

          <!-- Streaming note preview -->
          <div v-if="noteStreamContent" class="note-preview">
            <div class="note-preview-label">预览</div>
            <div class="note-preview-content">{{ noteStreamContent.slice(-300) }}</div>
          </div>

          <!-- Status message -->
          <div class="note-status">{{ noteStatusMessage }}</div>
        </div>

        <!-- Note generation result -->
        <div v-if="noteResult" class="note-result-widget">
          <CheckCircleOutlined class="result-icon" />
          <div class="result-info">
            <div class="result-title">笔记已保存</div>
            <div class="result-meta">
              <a-tag color="blue">{{ noteResult.classification?.categoryTitle }}</a-tag>
              <a-tag color="green">{{ noteResult.classification?.topicName }}</a-tag>
              <span class="result-path">{{ noteResult.filePath }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Token usage bar -->
      <div v-if="activeConversationId && currentMaxTokens > 0" class="token-usage-bar">
        <div class="token-info">
          <ThunderboltOutlined />
          <span
            >{{ formatTokens(conversationTotalTokens) }} /
            {{ formatTokens(currentMaxTokens) }} tokens</span
          >
          <span class="token-percent">({{ tokenUsagePercent }}%)</span>
          <a-tooltip v-if="tokenUsagePercent > 80" title="Token 用量较高，模型可能出现幻觉">
            <WarningOutlined class="token-warning" />
          </a-tooltip>
        </div>
        <a-progress
          :percent="tokenUsagePercent"
          :show-info="false"
          :stroke-color="tokenProgressColor"
          size="small"
        />
      </div>

      <!-- Input area -->
      <div class="input-area">
        <!-- Model selector + actions -->
        <div class="model-selector">
          <div class="model-selects">
            <a-select
              v-model:value="selectedProvider"
              :disabled="isStreaming || isGeneratingNote"
              size="small"
              style="width: 140px"
              @change="handleProviderChange"
            >
              <a-select-option v-for="p in configuredProviders" :key="p.id" :value="p.id">
                {{ p.label }}
              </a-select-option>
            </a-select>
            <a-select
              v-model:value="selectedModel"
              :disabled="isStreaming || isGeneratingNote"
              size="small"
              style="width: 200px"
            >
              <a-select-option v-for="m in currentModels" :key="m" :value="m">
                {{ m }}
              </a-select-option>
            </a-select>
          </div>
          <a-tooltip title="根据对话内容自动生成结构化学习笔记">
            <a-button
              size="small"
              :disabled="
                !activeConversationId || messages.length < 2 || isStreaming || isGeneratingNote
              "
              :loading="isGeneratingNote"
              @click="handleGenerateNote"
            >
              <FileTextOutlined />
              生成笔记
            </a-button>
          </a-tooltip>
        </div>

        <div class="input-wrapper">
          <a-textarea
            v-model:value="inputMessage"
            :placeholder="
              chatStatus?.configured
                ? '输入消息...(Enter 发送, Shift+Enter 换行)'
                : 'AI 未配置，请先设置 API_KEY'
            "
            :disabled="!chatStatus?.configured || isStreaming || isGeneratingNote"
            :auto-size="{ minRows: 1, maxRows: 6 }"
            @keydown.enter="handleEnterKey"
          />
          <a-button
            type="primary"
            :disabled="
              !inputMessage.trim() || !chatStatus?.configured || isStreaming || isGeneratingNote
            "
            :loading="isStreaming"
            @click="handleSend"
            class="send-btn"
          >
            <SendOutlined />
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import {
  PlusOutlined,
  MessageOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  RobotOutlined,
  SendOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  LoadingOutlined,
  CheckCircleOutlined
} from '@ant-design/icons-vue'
import { message as antMessage } from 'ant-design-vue'
import {
  chatApi,
  type ChatConversation,
  type ChatMessage,
  type ChatStatus,
  type ProviderInfo,
  type TokenUsage,
  type NoteProgressEvent,
  type NoteClassification,
  type NoteProgressStep
} from '@/services/api'

const chatStatus = ref<ChatStatus | null>(null)
const conversations = ref<ChatConversation[]>([])
const activeConversationId = ref<string>('')
const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const isStreaming = ref(false)
const streamingContent = ref('')
const messagesRef = ref<HTMLDivElement>()

const selectedProvider = ref('')
const selectedModel = ref('')

const editingId = ref<string>('')
const editingTitle = ref('')

// Token tracking
const conversationTotalTokens = ref(0)
const lastTurnUsage = ref<TokenUsage | null>(null)

// Note generation state
const isGeneratingNote = ref(false)
const noteStep = ref<NoteProgressStep | ''>('')
const noteClassification = ref<NoteClassification | null>(null)
const noteStreamContent = ref('')
const noteStatusMessage = ref('')
const noteResult = ref<NoteProgressEvent | null>(null)

const STEP_ORDER: NoteProgressStep[] = ['analyzing', 'classified', 'generating', 'saving', 'done']

const noteStepIndex = computed(() => {
  if (!noteStep.value) return -1
  return STEP_ORDER.indexOf(noteStep.value as NoteProgressStep)
})

const configuredProviders = computed<ProviderInfo[]>(
  () => chatStatus.value?.providers.filter(p => p.configured) || []
)

const currentModels = computed<string[]>(() => {
  const provider = configuredProviders.value.find(p => p.id === selectedProvider.value)
  return provider?.models || []
})

const currentMaxTokens = computed(() => {
  const provider = configuredProviders.value.find(p => p.id === selectedProvider.value)
  const limit = provider?.modelTokenLimits?.find(l => l.model === selectedModel.value)
  return limit?.maxTokens || 65536
})

const tokenUsagePercent = computed(() => {
  if (currentMaxTokens.value <= 0) return 0
  return Math.min(100, Math.round((conversationTotalTokens.value / currentMaxTokens.value) * 100))
})

const tokenProgressColor = computed(() => {
  const pct = tokenUsagePercent.value
  if (pct > 90) return '#ff4d4f'
  if (pct > 70) return '#faad14'
  return '#1890ff'
})

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const loadStatus = async () => {
  try {
    chatStatus.value = await chatApi.getStatus()
    if (chatStatus.value?.configured) {
      const first = configuredProviders.value[0]
      if (first) {
        selectedProvider.value = first.id
        selectedModel.value = first.defaultModel
      }
    }
  } catch {
    chatStatus.value = { configured: false, providers: [], activeProvider: '', activeModel: '' }
  }
}

const loadConversations = async () => {
  try {
    const data = await chatApi.listConversations()
    conversations.value = data.conversations
  } catch {
    conversations.value = []
  }
}

const loadConversation = async (id: string) => {
  try {
    const conv = await chatApi.getConversation(id)
    messages.value = conv.messages || []
    activeConversationId.value = id
    conversationTotalTokens.value = conv.totalTokens || 0
    if (conv.provider && configuredProviders.value.some(p => p.id === conv.provider)) {
      selectedProvider.value = conv.provider
      selectedModel.value = conv.model
    }
    noteResult.value = null
    await scrollToBottom()
  } catch {
    antMessage.error('加载对话失败')
  }
}

const handleProviderChange = () => {
  const provider = configuredProviders.value.find(p => p.id === selectedProvider.value)
  if (provider) {
    selectedModel.value = provider.defaultModel
  }
}

const handleNewChat = () => {
  activeConversationId.value = ''
  messages.value = []
  inputMessage.value = ''
  conversationTotalTokens.value = 0
  lastTurnUsage.value = null
  noteResult.value = null
}

const handleSelectConversation = (id: string) => {
  if (id === activeConversationId.value) return
  loadConversation(id)
}

const handleEditTitle = (conv: ChatConversation) => {
  editingId.value = conv.id
  editingTitle.value = conv.title
}

const handleSaveTitle = async (id: string) => {
  if (editingTitle.value.trim()) {
    try {
      await chatApi.updateTitle(id, editingTitle.value.trim())
      await loadConversations()
    } catch {
      antMessage.error('更新标题失败')
    }
  }
  editingId.value = ''
}

const handleDeleteConversation = async (id: string) => {
  try {
    await chatApi.deleteConversation(id)
    if (activeConversationId.value === id) {
      handleNewChat()
    }
    await loadConversations()
  } catch {
    antMessage.error('删除对话失败')
  }
}

const handleEnterKey = (e: KeyboardEvent) => {
  if (e.shiftKey) return
  e.preventDefault()
  handleSend()
}

const renderMarkdown = (content: string): string => {
  return content
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}

const handleSend = async () => {
  const msg = inputMessage.value.trim()
  if (!msg || isStreaming.value) return

  messages.value.push({ role: 'user', content: msg, timestamp: Date.now() })
  inputMessage.value = ''
  await nextTick()
  isStreaming.value = true
  streamingContent.value = ''
  noteResult.value = null
  await scrollToBottom()

  try {
    const convId = await chatApi.sendMessage(
      msg,
      {
        conversationId: activeConversationId.value || undefined,
        provider: selectedProvider.value,
        model: selectedModel.value
      },
      chunk => {
        if (chunk.error) {
          antMessage.error(chunk.error)
          return
        }
        if (!chunk.done) {
          streamingContent.value += chunk.content
          scrollToBottom()
        }
        if (chunk.done && chunk.tokenUsage) {
          lastTurnUsage.value = chunk.tokenUsage
          conversationTotalTokens.value = chunk.totalTokens || 0
        }
      }
    )

    if (streamingContent.value) {
      messages.value.push({
        role: 'assistant',
        content: streamingContent.value,
        timestamp: Date.now(),
        tokenUsage: lastTurnUsage.value || undefined
      })
    }

    if (convId && !activeConversationId.value) {
      activeConversationId.value = convId
    }

    await loadConversations()
  } catch (err) {
    antMessage.error(err instanceof Error ? err.message : '发送失败')
  } finally {
    isStreaming.value = false
    streamingContent.value = ''
    await scrollToBottom()
  }
}

const handleGenerateNote = async () => {
  if (!activeConversationId.value || isGeneratingNote.value) return

  isGeneratingNote.value = true
  noteStep.value = ''
  noteClassification.value = null
  noteStreamContent.value = ''
  noteStatusMessage.value = ''
  noteResult.value = null
  await scrollToBottom()

  try {
    await chatApi.generateNote(activeConversationId.value, event => {
      noteStep.value = event.step
      if (event.message) noteStatusMessage.value = event.message

      if (event.step === 'classified' && event.classification) {
        noteClassification.value = event.classification
      }

      if (event.step === 'generating' && event.content) {
        noteStreamContent.value += event.content
      }

      if (event.step === 'done') {
        noteResult.value = event
      }

      if (event.step === 'error') {
        antMessage.error(event.message || '生成失败')
      }

      scrollToBottom()
    })
  } catch (err) {
    antMessage.error(err instanceof Error ? err.message : '生成笔记失败')
  } finally {
    isGeneratingNote.value = false
    noteStep.value = ''
    noteStreamContent.value = ''
    await scrollToBottom()
  }
}

watch(messages, () => scrollToBottom(), { deep: true })

onMounted(async () => {
  await Promise.all([loadStatus(), loadConversations()])
})
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100%;
  background: #f5f5f5;
}

.chat-sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.new-chat-wrapper {
  padding: 16px;
  flex-shrink: 0;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  gap: 8px;
}

.conversation-item:hover {
  background: #f0f0f0;
}

.conversation-item.active {
  background: #e6f4ff;
}

.conv-icon {
  flex-shrink: 0;
  color: #999;
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.conv-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 12px;
  color: #999;
}

.conversation-item:hover .conv-actions {
  opacity: 1;
}

.conv-actions .anticon:hover {
  color: #1890ff;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.config-alert {
  margin: 16px 16px 0;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  color: #d9d9d9;
  margin-bottom: 16px;
}

.empty-chat h2 {
  color: #666;
  margin-bottom: 8px;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.message-user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.user-avatar {
  background: #1890ff;
}

.assistant-avatar {
  background: #52c41a;
}

.message-content {
  max-width: 70%;
  min-width: 0;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  word-break: break-word;
  font-size: 14px;
}

.message-user .message-bubble {
  background: #1890ff;
  color: #fff;
  border-top-right-radius: 4px;
}

.message-assistant .message-bubble {
  background: #fff;
  color: #333;
  border-top-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.message-token-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: #999;
  background: #f5f5f5;
  border-radius: 10px;
}

.message-bubble :deep(pre) {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-bubble :deep(code) {
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 13px;
}

.message-bubble :deep(code:not(pre code)) {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
}

.message-user .message-bubble :deep(code:not(pre code)) {
  background: rgba(255, 255, 255, 0.2);
}

.streaming-bubble {
  background: #fff;
  color: #333;
  border-top-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  white-space: pre-wrap;
}

.typing-indicator {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #999;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Note generation progress widget */
.note-progress-widget {
  background: linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%);
  border: 1px solid #bae0ff;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
}

.note-progress-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1890ff;
  margin-bottom: 16px;
}

.note-steps {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.note-step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #bbb;
  transition: color 0.3s;
}

.note-step.active {
  color: #1890ff;
  font-weight: 500;
}

.note-step.done {
  color: #52c41a;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d9d9d9;
  display: inline-block;
}

.note-classification {
  margin-bottom: 12px;
}

.note-preview {
  background: #fff;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
  max-height: 120px;
  overflow-y: auto;
}

.note-preview-label {
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.note-preview-content {
  font-size: 13px;
  color: #555;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.note-status {
  font-size: 12px;
  color: #888;
}

/* Note result widget */
.note-result-widget {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 24px;
}

.result-icon {
  font-size: 24px;
  color: #52c41a;
  flex-shrink: 0;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.result-path {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

/* Token usage bar */
.token-usage-bar {
  padding: 6px 24px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.token-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.token-percent {
  color: #aaa;
}

.token-warning {
  color: #faad14;
  font-size: 14px;
}

.input-area {
  padding: 12px 24px 16px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
}

.model-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.model-selects {
  display: flex;
  gap: 8px;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-wrapper :deep(.ant-input) {
  border-radius: 8px;
  resize: none;
}

.send-btn {
  flex-shrink: 0;
  height: 40px;
  width: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
