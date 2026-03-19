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
        <div v-if="messages.length === 0" class="empty-chat">
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
      </div>

      <!-- Input area -->
      <div class="input-area">
        <!-- Model selector -->
        <div class="model-selector">
          <a-select
            v-model:value="selectedProvider"
            :disabled="isStreaming"
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
            :disabled="isStreaming"
            size="small"
            style="width: 200px"
          >
            <a-select-option v-for="m in currentModels" :key="m" :value="m">
              {{ m }}
            </a-select-option>
          </a-select>
        </div>

        <div class="input-wrapper">
          <a-textarea
            v-model:value="inputMessage"
            :placeholder="
              chatStatus?.configured
                ? '输入消息...(Enter 发送, Shift+Enter 换行)'
                : 'AI 未配置，请先设置 API_KEY'
            "
            :disabled="!chatStatus?.configured || isStreaming"
            :auto-size="{ minRows: 1, maxRows: 6 }"
            @keydown.enter="handleEnterKey"
          />
          <a-button
            type="primary"
            :disabled="!inputMessage.trim() || !chatStatus?.configured || isStreaming"
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
  SendOutlined
} from '@ant-design/icons-vue'
import { message as antMessage } from 'ant-design-vue'
import {
  chatApi,
  type ChatConversation,
  type ChatMessage,
  type ChatStatus,
  type ProviderInfo
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

const configuredProviders = computed<ProviderInfo[]>(
  () => chatStatus.value?.providers.filter(p => p.configured) || []
)

const currentModels = computed<string[]>(() => {
  const provider = configuredProviders.value.find(p => p.id === selectedProvider.value)
  return provider?.models || []
})

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
    // Sync provider/model selector to the conversation's settings
    if (conv.provider && configuredProviders.value.some(p => p.id === conv.provider)) {
      selectedProvider.value = conv.provider
      selectedModel.value = conv.model
    }
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
      }
    )

    if (streamingContent.value) {
      messages.value.push({
        role: 'assistant',
        content: streamingContent.value,
        timestamp: Date.now()
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

.input-area {
  padding: 12px 24px 16px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
}

.model-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
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
