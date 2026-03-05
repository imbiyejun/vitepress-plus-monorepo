<template>
  <div class="server-manager">
    <div class="server-header">
      <div class="header-content">
        <h2>服务器管理</h2>
        <a-space>
          <a-button type="primary" @click="showInitModal = true">
            <template #icon><SettingOutlined /></template>
            一键初始化
          </a-button>
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

    <!-- Server Init Modal -->
    <a-modal
      v-model:open="showInitModal"
      title="一键初始化服务器环境"
      width="700px"
      :footer="null"
      :maskClosable="!initTask || initTask.status !== 'running'"
      :closable="!initTask || initTask.status !== 'running'"
      @cancel="handleInitModalClose"
    >
      <div class="init-modal-content">
        <!-- Environment Status -->
        <a-card
          title="当前环境状态"
          size="small"
          style="margin-bottom: 16px"
          :loading="loadingEnvStatus"
        >
          <a-row :gutter="16" v-if="envStatus">
            <a-col :span="8">
              <a-statistic title="Nginx">
                <template #formatter>
                  <a-tag :color="envStatus.hasNginx ? 'success' : 'default'">
                    {{ envStatus.hasNginx ? envStatus.nginxVersion || '已安装' : '未安装' }}
                  </a-tag>
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="8">
              <a-statistic title="Node.js">
                <template #formatter>
                  <a-tag :color="envStatus.hasNode ? 'success' : 'default'">
                    {{ envStatus.hasNode ? envStatus.nodeVersion || '已安装' : '未安装' }}
                  </a-tag>
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="8">
              <a-statistic title="pnpm">
                <template #formatter>
                  <a-tag :color="envStatus.hasPnpm ? 'success' : 'default'">
                    {{ envStatus.hasPnpm ? '已安装' : '未安装' }}
                  </a-tag>
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="8" style="margin-top: 12px">
              <a-statistic title="PM2">
                <template #formatter>
                  <a-tag :color="envStatus.hasPm2 ? 'success' : 'default'">
                    {{ envStatus.hasPm2 ? '已安装' : '未安装' }}
                  </a-tag>
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="8" style="margin-top: 12px">
              <a-statistic title="Git">
                <template #formatter>
                  <a-tag :color="envStatus.hasGit ? 'success' : 'default'">
                    {{ envStatus.hasGit ? '已安装' : '未安装' }}
                  </a-tag>
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="8" style="margin-top: 12px">
              <a-button size="small" @click="loadEnvStatus">
                <template #icon><ReloadOutlined /></template>
                刷新
              </a-button>
            </a-col>
          </a-row>
          <a-divider style="margin: 12px 0" />
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="访问方式">
              <a-tag v-if="envStatus?.domain" color="blue"> 域名: {{ envStatus?.domain }} </a-tag>
              <a-tag v-else-if="envStatus?.serverIp" color="orange">
                IP: {{ envStatus?.serverIp }}
              </a-tag>
              <a-tag v-else color="default">未配置</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="部署路径">
              {{ envStatus?.remotePath || '/var/www/vitepress' }}
            </a-descriptions-item>
          </a-descriptions>
          <a-alert
            v-if="!envStatus?.domain"
            message="提示: 可在 .env 文件中添加 DEPLOY_DOMAIN 配置域名"
            type="info"
            show-icon
            style="margin-top: 8px"
          />
        </a-card>

        <!-- Init Configuration -->
        <a-card
          title="初始化配置"
          size="small"
          style="margin-bottom: 16px"
          v-if="!initTask || initTask.status !== 'running'"
        >
          <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
            <a-form-item label="网站目录">
              <a-input
                v-model:value="initConfig.webRoot"
                :placeholder="envStatus?.remotePath || '/var/www/vitepress'"
              />
              <template #extra v-if="envStatus?.remotePath">
                <small>将使用环境变量配置的路径: {{ envStatus.remotePath }}</small>
              </template>
            </a-form-item>
            <a-form-item label="Node.js 版本">
              <a-select v-model:value="initConfig.nodeVersion" style="width: 100%">
                <a-select-option value="18">Node.js 18 LTS</a-select-option>
                <a-select-option value="20">Node.js 20 LTS</a-select-option>
                <a-select-option value="22">Node.js 22</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="访问域名">
              <a-input
                v-model:value="initConfig.domain"
                :placeholder="envStatus?.domain || '留空则使用IP访问'"
              />
              <template #extra>
                <small v-if="envStatus?.domain">
                  将使用环境变量配置的域名: {{ envStatus.domain }}
                </small>
                <small v-else-if="envStatus?.serverIp">
                  未配置域名，将使用 IP 访问: {{ envStatus.serverIp }}
                </small>
              </template>
            </a-form-item>
            <a-form-item label="启用 SSL">
              <a-switch
                v-model:checked="initConfig.enableSsl"
                :disabled="!initConfig.domain && !envStatus?.domain"
              />
              <template #extra v-if="!initConfig.domain && !envStatus?.domain">
                <small>需要配置域名才能启用 SSL</small>
              </template>
            </a-form-item>
            <template v-if="initConfig.enableSsl">
              <a-form-item label="SSL 证书路径">
                <a-input
                  v-model:value="initConfig.sslCertPath"
                  placeholder="留空则使用 Let's Encrypt 自动申请"
                />
              </a-form-item>
              <a-form-item label="SSL 密钥路径">
                <a-input
                  v-model:value="initConfig.sslKeyPath"
                  placeholder="留空则使用 Let's Encrypt 自动申请"
                />
              </a-form-item>
            </template>
          </a-form>
          <a-button type="primary" block :loading="startingInit" @click="handleStartInit">
            <template #icon><ThunderboltOutlined /></template>
            开始初始化
          </a-button>
        </a-card>

        <!-- Init Progress -->
        <a-card title="初始化进度" size="small" v-if="initTask">
          <!-- Overall Progress -->
          <div class="init-progress-header" v-if="initTask.status === 'running'">
            <a-progress
              :percent="overallProgress"
              status="active"
              :stroke-color="{ from: '#108ee9', to: '#87d068' }"
            />
            <div class="elapsed-time">已用时: {{ formatElapsedTime(initTask.startTime) }}</div>
          </div>

          <a-collapse v-model:activeKey="activeStepKeys" class="init-steps-collapse">
            <a-collapse-panel
              v-for="step in initTask.steps"
              :key="step.id"
              :collapsible="step.logs && step.logs.length > 0 ? undefined : 'disabled'"
            >
              <template #header>
                <div class="step-header">
                  <span class="step-icon">
                    <LoadingOutlined v-if="step.status === 'running'" spin />
                    <CheckCircleOutlined
                      v-else-if="step.status === 'success'"
                      style="color: #52c41a"
                    />
                    <CloseCircleOutlined
                      v-else-if="step.status === 'error'"
                      style="color: #ff4d4f"
                    />
                    <ClockCircleOutlined v-else style="color: #d9d9d9" />
                  </span>
                  <span class="step-title">{{ step.title }}</span>
                  <span class="step-duration" v-if="step.startTime">
                    {{ formatStepDuration(step) }}
                  </span>
                </div>
              </template>
              <template #extra>
                <a-tag v-if="step.status === 'running'" color="processing">执行中</a-tag>
                <a-tag v-else-if="step.status === 'success'" color="success">{{
                  step.message
                }}</a-tag>
                <a-tag v-else-if="step.status === 'error'" color="error">失败</a-tag>
                <a-tag v-else color="default">等待中</a-tag>
              </template>
              <!-- Step Logs -->
              <div class="step-logs" v-if="step.logs && step.logs.length > 0">
                <div
                  v-for="(log, idx) in step.logs"
                  :key="idx"
                  class="log-line"
                  :class="{ 'log-success': log.includes('✓'), 'log-error': log.includes('✗') }"
                >
                  {{ log }}
                </div>
              </div>
            </a-collapse-panel>
          </a-collapse>

          <div class="init-result" v-if="initTask.status !== 'running'">
            <a-result
              v-if="initTask.status === 'success'"
              status="success"
              title="初始化完成"
              :sub-title="initSuccessMessage"
            >
              <template #extra>
                <a-space direction="vertical" align="center">
                  <div v-if="accessUrl" class="access-url">
                    访问地址: <a :href="accessUrl" target="_blank">{{ accessUrl }}</a>
                  </div>
                  <a-button type="primary" @click="handleInitModalClose">完成</a-button>
                </a-space>
              </template>
            </a-result>
            <a-result
              v-else-if="initTask.status === 'error'"
              status="error"
              title="初始化失败"
              :sub-title="initTask.error"
            >
              <template #extra>
                <a-space>
                  <a-button @click="initTask = null">重新配置</a-button>
                  <a-button type="primary" @click="handleStartInit">重试</a-button>
                </a-space>
              </template>
            </a-result>
          </div>
        </a-card>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
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
  InboxOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons-vue'
import type { UploadFile } from 'ant-design-vue'
import {
  serverApi,
  type ServerStatus,
  type ServerDirectoryContents,
  type ServerFileInfo,
  type TerminalMessage,
  type ServerInitConfig,
  type ServerEnvStatus,
  type InitTask,
  type InitMessage,
  type InitStep
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

// Server init state
const showInitModal = ref(false)
const loadingEnvStatus = ref(false)
const envStatus = ref<ServerEnvStatus | null>(null)
const initConfig = ref<ServerInitConfig>({
  webRoot: '/var/www/vitepress',
  nodeVersion: '20',
  enableSsl: false,
  domain: '',
  sslCertPath: '',
  sslKeyPath: ''
})
const startingInit = ref(false)
const initTask = ref<InitTask | null>(null)
const activeStepKeys = ref<string[]>([])

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
  const msg = data as TerminalMessage | InitMessage

  // Handle init messages
  if (msg.type?.startsWith('init:')) {
    const initMsg = msg as InitMessage
    initTask.value = initMsg.task

    // Auto-expand running step
    const runningStep = initMsg.task.steps.find(s => s.status === 'running')
    if (runningStep && !activeStepKeys.value.includes(runningStep.id)) {
      activeStepKeys.value = [runningStep.id]
    }

    if (initMsg.type === 'init:complete') {
      message.success('服务器环境初始化完成')
      activeStepKeys.value = []
      loadEnvStatus()
    } else if (initMsg.type === 'init:error') {
      message.error('初始化失败: ' + initMsg.task.error)
    }
    return
  }

  const termMsg = msg as TerminalMessage

  switch (termMsg.type) {
    case 'terminal:connect':
      terminalSessionId.value = termMsg.sessionId
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
      if (termMsg.data) {
        terminal?.write(termMsg.data)
      }
      break

    case 'terminal:disconnect':
      terminalConnected.value = false
      terminalSessionId.value = ''
      message.info('终端已断开')
      break

    case 'terminal:error':
      terminalConnecting.value = false
      message.error(termMsg.error || '终端错误')
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

// Server init functions
const loadEnvStatus = async () => {
  loadingEnvStatus.value = true
  try {
    envStatus.value = await serverApi.getEnvStatus()
  } catch (error) {
    console.error('Failed to load env status:', error)
  } finally {
    loadingEnvStatus.value = false
  }
}

const handleStartInit = async () => {
  if (initConfig.value.enableSsl && !initConfig.value.domain) {
    message.warning('启用 SSL 时必须填写域名')
    return
  }

  startingInit.value = true
  try {
    await serverApi.startInit(initConfig.value)
    message.info('初始化任务已启动')
  } catch (error) {
    console.error('Failed to start init:', error)
  } finally {
    startingInit.value = false
  }
}

const handleInitModalClose = () => {
  if (initTask.value?.status === 'running') {
    return
  }
  showInitModal.value = false
  initTask.value = null
}

const accessUrl = computed(() => {
  if (!initTask.value?.config) return ''
  const config = initTask.value.config
  const protocol = config.enableSsl ? 'https' : 'http'
  const host = config.domain || config.serverIp || envStatus.value?.serverIp
  if (!host) return ''
  return `${protocol}://${host}`
})

const initSuccessMessage = computed(() => {
  const config = initTask.value?.config
  if (!config) return '服务器环境已配置完成，可以开始部署项目了'

  const accessType = config.domain
    ? `域名 ${config.domain}`
    : config.serverIp
      ? `IP ${config.serverIp}`
      : 'IP'

  return `服务器环境已配置完成，Nginx 已配置为通过 ${accessType} 访问`
})

const overallProgress = computed(() => {
  if (!initTask.value) return 0
  const steps = initTask.value.steps
  const completed = steps.filter(s => s.status === 'success' || s.status === 'skipped').length
  const running = steps.find(s => s.status === 'running')
  const progress = (completed / steps.length) * 100
  return Math.round(running ? progress + 100 / steps.length / 2 : progress)
})

const formatElapsedTime = (startTime: number): string => {
  const elapsed = Date.now() - startTime
  const seconds = Math.floor(elapsed / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`
  }
  return `${seconds}秒`
}

const formatStepDuration = (step: InitStep): string => {
  if (!step.startTime) return ''
  const endTime = step.endTime || Date.now()
  const duration = endTime - step.startTime
  const seconds = Math.floor(duration / 1000)
  return seconds > 0 ? `${seconds}s` : ''
}

let unsubscribe: (() => void) | null = null

// Load env status when init modal opens
watch(showInitModal, newVal => {
  if (newVal && !envStatus.value) {
    loadEnvStatus()
  }
})

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

.init-modal-content {
  max-height: 70vh;
  overflow-y: auto;
}

.init-progress-header {
  margin-bottom: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.elapsed-time {
  text-align: center;
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.init-steps-collapse {
  margin-bottom: 16px;
}

.init-steps-collapse :deep(.ant-collapse-header) {
  padding: 8px 12px !important;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-icon {
  font-size: 16px;
}

.step-title {
  flex: 1;
}

.step-duration {
  font-size: 12px;
  color: #999;
}

.step-logs {
  max-height: 200px;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 8px 12px;
  font-family: 'Fira Code', Consolas, Monaco, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
}

.log-line {
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-line.log-success {
  color: #52c41a;
}

.log-line.log-error {
  color: #ff4d4f;
}

.init-result {
  margin-top: 16px;
}

.access-url {
  font-size: 14px;
  margin-bottom: 12px;
}

.access-url a {
  color: #1890ff;
}
</style>
