<template>
  <div class="server-manager">
    <div class="server-header">
      <div class="header-content">
        <h2>服务器管理</h2>
        <a-space>
          <a-button :loading="testingConnection" @click="handleTestConnection">
            <template #icon><ApiOutlined /></template>
            测试连接
          </a-button>
        </a-space>
      </div>
      <a-alert
        message="服务器管理"
        description="可视化管理远程服务器文件，支持文件上传下载、在线编辑和终端操作。"
        type="info"
        show-icon
        style="margin-top: 16px"
      />
    </div>

    <a-spin :spinning="loading">
      <template v-if="!serverStatus.configured">
        <a-result status="warning" title="服务器未配置">
          <template #subTitle>
            <p>请在 .env 文件中配置以下变量：</p>
            <div class="config-hint">
              <pre>
DEPLOY_HOST=your_server_ip
DEPLOY_PORT=22
DEPLOY_USERNAME=your_username
DEPLOY_PASSWORD=your_password</pre
              >
            </div>
          </template>
        </a-result>
      </template>

      <template v-else>
        <a-tabs v-model:activeKey="activeTab" class="server-tabs">
          <a-tab-pane key="files" tab="文件管理">
            <div class="file-manager">
              <!-- Toolbar -->
              <div class="toolbar">
                <a-breadcrumb>
                  <a-breadcrumb-item
                    v-for="crumb in directoryContents.breadcrumbs"
                    :key="crumb.path"
                  >
                    <a @click="navigateToPath(crumb.path)">{{ crumb.name }}</a>
                  </a-breadcrumb-item>
                </a-breadcrumb>
                <a-space>
                  <a-button size="small" @click="refreshDirectory">
                    <template #icon><ReloadOutlined /></template>
                  </a-button>
                  <a-button size="small" type="primary" @click="showUploadModal = true">
                    <template #icon><UploadOutlined /></template>
                    上传
                  </a-button>
                  <a-button size="small" @click="showCreateDirModal = true">
                    <template #icon><FolderAddOutlined /></template>
                    新建文件夹
                  </a-button>
                </a-space>
              </div>

              <!-- File list -->
              <a-table
                :dataSource="directoryContents.items"
                :columns="fileColumns"
                :loading="loadingFiles"
                :pagination="false"
                rowKey="path"
                size="small"
                :scroll="{ y: 'calc(100vh - 400px)' }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'name'">
                    <div class="file-name" @click="handleFileClick(record)">
                      <FolderOutlined v-if="record.type === 'directory'" class="icon folder" />
                      <FileOutlined v-else class="icon file" />
                      <span>{{ record.name }}</span>
                    </div>
                  </template>
                  <template v-else-if="column.key === 'size'">
                    {{ record.type === 'directory' ? '-' : formatSize(record.size) }}
                  </template>
                  <template v-else-if="column.key === 'modifyTime'">
                    {{ formatTime(record.modifyTime) }}
                  </template>
                  <template v-else-if="column.key === 'mode'">
                    <code>{{ record.mode }}</code>
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <a-space>
                      <a-button
                        v-if="record.type === 'file'"
                        type="link"
                        size="small"
                        @click="handleDownload(record)"
                      >
                        <DownloadOutlined />
                      </a-button>
                      <a-button
                        v-if="record.type === 'file' && isTextFile(record.name)"
                        type="link"
                        size="small"
                        @click="handleEditFile(record)"
                      >
                        <EditOutlined />
                      </a-button>
                      <a-button type="link" size="small" @click="handleRename(record)">
                        <FormOutlined />
                      </a-button>
                      <a-popconfirm
                        :title="`确定删除 ${record.name}？`"
                        @confirm="handleDelete(record)"
                      >
                        <a-button type="link" size="small" danger>
                          <DeleteOutlined />
                        </a-button>
                      </a-popconfirm>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </div>
          </a-tab-pane>

          <a-tab-pane key="terminal" tab="终端">
            <div class="terminal-container">
              <div class="terminal-toolbar">
                <a-button
                  v-if="!terminalConnected"
                  type="primary"
                  :loading="terminalConnecting"
                  @click="connectTerminal"
                >
                  <template #icon><CodeOutlined /></template>
                  连接终端
                </a-button>
                <a-button v-else danger @click="disconnectTerminal">
                  <template #icon><DisconnectOutlined /></template>
                  断开连接
                </a-button>
              </div>
              <div ref="terminalRef" class="terminal-wrapper"></div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </template>
    </a-spin>

    <!-- Upload Modal -->
    <a-modal
      v-model:open="showUploadModal"
      title="上传文件"
      @ok="handleUpload"
      @cancel="uploadFileList = []"
      :confirmLoading="uploading"
    >
      <a-upload-dragger
        v-model:fileList="uploadFileList"
        :multiple="true"
        :beforeUpload="() => false"
      >
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p class="ant-upload-hint">支持单个或批量上传</p>
      </a-upload-dragger>
    </a-modal>

    <!-- Create Directory Modal -->
    <a-modal
      v-model:open="showCreateDirModal"
      title="新建文件夹"
      @ok="handleCreateDirectory"
      :confirmLoading="creatingDir"
    >
      <a-input v-model:value="newDirName" placeholder="请输入文件夹名称" />
    </a-modal>

    <!-- Rename Modal -->
    <a-modal
      v-model:open="showRenameModal"
      title="重命名"
      @ok="handleRenameConfirm"
      :confirmLoading="renaming"
    >
      <a-input v-model:value="newName" placeholder="请输入新名称" />
    </a-modal>

    <!-- File Editor Modal -->
    <a-modal
      v-model:open="showEditorModal"
      :title="`编辑文件: ${editingFile?.name || ''}`"
      width="80%"
      :bodyStyle="{ padding: '0' }"
      @ok="handleSaveFile"
      :confirmLoading="savingFile"
    >
      <a-textarea
        v-model:value="fileContent"
        :autoSize="{ minRows: 20, maxRows: 30 }"
        class="code-editor"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import {
  ApiOutlined,
  ReloadOutlined,
  UploadOutlined,
  FolderAddOutlined,
  FolderOutlined,
  FileOutlined,
  DownloadOutlined,
  EditOutlined,
  FormOutlined,
  DeleteOutlined,
  CodeOutlined,
  DisconnectOutlined,
  InboxOutlined
} from '@ant-design/icons-vue'
import type { UploadFile } from 'ant-design-vue'
import {
  serverApi,
  type ServerStatus,
  type ServerDirectoryContents,
  type ServerFileInfo,
  type TerminalMessage
} from '@/services/api'
import { wsService } from '@/services/websocket'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const loading = ref(false)
const testingConnection = ref(false)
const activeTab = ref('files')

const serverStatus = ref<ServerStatus>({ configured: false })

// File manager state
const loadingFiles = ref(false)
const directoryContents = reactive<ServerDirectoryContents>({
  items: [],
  currentPath: '/',
  breadcrumbs: []
})

// Upload state
const showUploadModal = ref(false)
const uploadFileList = ref<UploadFile[]>([])
const uploading = ref(false)

// Create directory state
const showCreateDirModal = ref(false)
const newDirName = ref('')
const creatingDir = ref(false)

// Rename state
const showRenameModal = ref(false)
const renamingFile = ref<ServerFileInfo | null>(null)
const newName = ref('')
const renaming = ref(false)

// File editor state
const showEditorModal = ref(false)
const editingFile = ref<ServerFileInfo | null>(null)
const fileContent = ref('')
const savingFile = ref(false)

// Terminal state
const terminalRef = ref<HTMLElement | null>(null)
const terminalConnected = ref(false)
const terminalConnecting = ref(false)
const terminalSessionId = ref('')
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null

const fileColumns = [
  { title: '名称', key: 'name', ellipsis: true },
  { title: '大小', key: 'size', width: 100 },
  { title: '权限', key: 'mode', width: 80 },
  { title: '修改时间', key: 'modifyTime', width: 180 },
  { title: '操作', key: 'actions', width: 150 }
]

// Utility functions
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTime = (isoString: string): string => {
  return new Date(isoString).toLocaleString('zh-CN')
}

const isTextFile = (filename: string): boolean => {
  const textExtensions = [
    '.txt',
    '.md',
    '.json',
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.vue',
    '.css',
    '.scss',
    '.less',
    '.html',
    '.xml',
    '.yaml',
    '.yml',
    '.conf',
    '.ini',
    '.sh',
    '.bash',
    '.zsh',
    '.py',
    '.rb',
    '.php',
    '.java',
    '.c',
    '.cpp',
    '.h',
    '.go',
    '.rs',
    '.env',
    '.gitignore',
    '.log',
    '.sql',
    '.nginx',
    '.htaccess'
  ]
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return textExtensions.includes(ext) || !filename.includes('.')
}

// Load server status
const loadStatus = async () => {
  loading.value = true
  try {
    serverStatus.value = await serverApi.getStatus()
    if (serverStatus.value.configured) {
      await loadDirectory('/')
    }
  } catch (error) {
    console.error('Failed to load server status:', error)
    message.error('加载服务器状态失败')
  } finally {
    loading.value = false
  }
}

// Test connection
const handleTestConnection = async () => {
  testingConnection.value = true
  try {
    await serverApi.testConnection()
    message.success('连接成功')
  } catch (error) {
    console.error('Connection test failed:', error)
  } finally {
    testingConnection.value = false
  }
}

// Load directory
const loadDirectory = async (path: string) => {
  loadingFiles.value = true
  try {
    const contents = await serverApi.listDirectory(path)
    Object.assign(directoryContents, contents)
  } catch (error) {
    console.error('Failed to load directory:', error)
    message.error('加载目录失败')
  } finally {
    loadingFiles.value = false
  }
}

const navigateToPath = (path: string) => {
  loadDirectory(path)
}

const refreshDirectory = () => {
  loadDirectory(directoryContents.currentPath)
}

const handleFileClick = (file: ServerFileInfo) => {
  if (file.type === 'directory') {
    loadDirectory(file.path)
  }
}

// File operations
const handleDownload = async (file: ServerFileInfo) => {
  try {
    await serverApi.downloadFile(file.path)
    message.success('下载开始')
  } catch (error) {
    console.error('Download failed:', error)
  }
}

const handleEditFile = async (file: ServerFileInfo) => {
  try {
    const result = await serverApi.readFile(file.path)
    editingFile.value = file
    fileContent.value = result.content
    showEditorModal.value = true
  } catch (error) {
    console.error('Failed to read file:', error)
  }
}

const handleSaveFile = async () => {
  if (!editingFile.value) return
  savingFile.value = true
  try {
    await serverApi.writeFile(editingFile.value.path, fileContent.value)
    showEditorModal.value = false
    message.success('文件保存成功')
  } catch (error) {
    console.error('Failed to save file:', error)
  } finally {
    savingFile.value = false
  }
}

const handleRename = (file: ServerFileInfo) => {
  renamingFile.value = file
  newName.value = file.name
  showRenameModal.value = true
}

const handleRenameConfirm = async () => {
  if (!renamingFile.value || !newName.value) return
  renaming.value = true
  try {
    const oldPath = renamingFile.value.path
    const newPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName.value
    await serverApi.rename(oldPath, newPath)
    showRenameModal.value = false
    refreshDirectory()
  } catch (error) {
    console.error('Rename failed:', error)
  } finally {
    renaming.value = false
  }
}

const handleDelete = async (file: ServerFileInfo) => {
  try {
    if (file.type === 'directory') {
      await serverApi.deleteDirectory(file.path, true)
    } else {
      await serverApi.deleteFile(file.path)
    }
    refreshDirectory()
  } catch (error) {
    console.error('Delete failed:', error)
  }
}

const handleUpload = async () => {
  if (uploadFileList.value.length === 0) {
    message.warning('请选择文件')
    return
  }
  uploading.value = true
  try {
    const files = uploadFileList.value.map(f => f.originFileObj as File)
    await serverApi.uploadFiles(files, directoryContents.currentPath)
    message.success('上传成功')
    showUploadModal.value = false
    uploadFileList.value = []
    refreshDirectory()
  } catch (error) {
    console.error('Upload failed:', error)
  } finally {
    uploading.value = false
  }
}

const handleCreateDirectory = async () => {
  if (!newDirName.value) {
    message.warning('请输入文件夹名称')
    return
  }
  creatingDir.value = true
  try {
    const path = `${directoryContents.currentPath}/${newDirName.value}`.replace(/\/+/g, '/')
    await serverApi.createDirectory(path)
    showCreateDirModal.value = false
    newDirName.value = ''
    refreshDirectory()
  } catch (error) {
    console.error('Create directory failed:', error)
  } finally {
    creatingDir.value = false
  }
}

// Terminal functions
const initTerminal = () => {
  if (terminal) return

  terminal = new Terminal({
    cursorBlink: true,
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4'
    },
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace'
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
}

const connectTerminal = async () => {
  terminalConnecting.value = true

  try {
    initTerminal()

    await nextTick()

    if (terminalRef.value && terminal) {
      terminal.open(terminalRef.value)
      fitAddon?.fit()
    }

    // Send connect message via WebSocket
    wsService.send({
      type: 'terminal:connect',
      sessionId: ''
    })
  } catch (error) {
    console.error('Failed to connect terminal:', error)
    message.error('连接终端失败')
    terminalConnecting.value = false
  }
}

const disconnectTerminal = () => {
  if (terminalSessionId.value) {
    wsService.send({
      type: 'terminal:disconnect',
      sessionId: terminalSessionId.value
    })
  }
  terminalConnected.value = false
  terminalSessionId.value = ''
  terminal?.clear()
}

// Handle terminal WebSocket messages
const handleWsMessage = (data: unknown) => {
  const msg = data as TerminalMessage

  switch (msg.type) {
    case 'terminal:connect':
      terminalSessionId.value = msg.sessionId
      terminalConnected.value = true
      terminalConnecting.value = false

      // Setup terminal input handler
      terminal?.onData(data => {
        wsService.send({
          type: 'terminal:data',
          sessionId: terminalSessionId.value,
          data
        })
      })

      // Send initial resize
      if (terminal && fitAddon) {
        wsService.send({
          type: 'terminal:resize',
          sessionId: terminalSessionId.value,
          cols: terminal.cols,
          rows: terminal.rows
        })
      }
      break

    case 'terminal:data':
      if (msg.data) {
        terminal?.write(msg.data)
      }
      break

    case 'terminal:disconnect':
      terminalConnected.value = false
      terminalSessionId.value = ''
      message.info('终端已断开')
      break

    case 'terminal:error':
      terminalConnecting.value = false
      message.error(msg.error || '终端错误')
      break
  }
}

// Handle window resize
const handleResize = () => {
  if (fitAddon && terminalConnected.value) {
    fitAddon.fit()
    if (terminal && terminalSessionId.value) {
      wsService.send({
        type: 'terminal:resize',
        sessionId: terminalSessionId.value,
        cols: terminal.cols,
        rows: terminal.rows
      })
    }
  }
}

let unsubscribe: (() => void) | null = null

onMounted(() => {
  loadStatus()
  unsubscribe = wsService.onMessage(handleWsMessage)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
  window.removeEventListener('resize', handleResize)
  disconnectTerminal()
  terminal?.dispose()
})
</script>

<style scoped>
.server-manager {
  height: 100%;
  padding: 24px;
}

.server-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.config-hint {
  text-align: left;
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  margin-top: 16px;
}

.config-hint pre {
  margin: 0;
  font-family: monospace;
  white-space: pre-wrap;
}

.server-tabs {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
}

.file-manager {
  min-height: 500px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.file-name:hover {
  color: #1890ff;
}

.file-name .icon {
  font-size: 16px;
}

.file-name .icon.folder {
  color: #faad14;
}

.file-name .icon.file {
  color: #1890ff;
}

.terminal-container {
  height: 500px;
  display: flex;
  flex-direction: column;
}

.terminal-toolbar {
  padding: 12px;
  background: #fafafa;
  border-radius: 4px 4px 0 0;
}

.terminal-wrapper {
  flex: 1;
  background: #1e1e1e;
  border-radius: 0 0 4px 4px;
  padding: 8px;
}

.code-editor {
  font-family: 'Fira Code', Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: #1e1e1e;
  color: #d4d4d4;
  border: none;
  resize: none;
}

.code-editor:focus {
  box-shadow: none;
}
</style>
