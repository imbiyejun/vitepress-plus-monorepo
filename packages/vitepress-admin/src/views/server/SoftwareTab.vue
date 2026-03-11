<template>
  <div class="software-tab">
    <div class="software-toolbar">
      <a-button size="small" @click="loadSoftwareStatus" :loading="loadingStatus">
        <template #icon><ReloadOutlined /></template>
        刷新状态
      </a-button>
    </div>

    <a-spin :spinning="loadingStatus">
      <!-- Installed software section -->
      <template v-if="installedList.length > 0">
        <div class="section-label">已安装</div>
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :sm="12" :md="8" :lg="6" v-for="sw in installedList" :key="sw.id">
            <a-card hoverable class="software-card installed" @click="showActions(sw)">
              <div class="card-body">
                <div class="sw-icon" :style="{ background: sw.color + '18', color: sw.color }">
                  <component :is="getSoftwareIcon(sw.icon)" />
                </div>
                <div class="sw-info">
                  <div class="sw-name">{{ sw.name }}</div>
                  <div class="sw-desc">{{ sw.description }}</div>
                </div>
                <div class="sw-status">
                  <a-tag color="success">{{ sw.version || '已安装' }}</a-tag>
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </template>

      <!-- Not installed software section -->
      <template v-if="notInstalledList.length > 0">
        <div class="section-label">可安装</div>
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :sm="12" :md="8" :lg="6" v-for="sw in notInstalledList" :key="sw.id">
            <a-card hoverable class="software-card not-installed" @click="showActions(sw)">
              <div class="card-body">
                <div class="sw-icon dimmed" :style="{ background: '#f5f5f5', color: '#bfbfbf' }">
                  <component :is="getSoftwareIcon(sw.icon)" />
                </div>
                <div class="sw-info">
                  <div class="sw-name">{{ sw.name }}</div>
                  <div class="sw-desc">{{ sw.description }}</div>
                </div>
                <div class="sw-status">
                  <a-tag color="default">未安装</a-tag>
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </template>

      <a-empty v-if="softwareList.length === 0 && !loadingStatus" description="暂无软件信息" />
    </a-spin>

    <!-- Software action drawer -->
    <a-drawer
      v-model:open="actionDrawerVisible"
      :title="selectedSoftware?.name"
      width="480"
      placement="right"
    >
      <template v-if="selectedSoftware">
        <div class="drawer-header-info">
          <div
            class="sw-icon large"
            :style="{ background: selectedSoftware.color + '18', color: selectedSoftware.color }"
          >
            <component :is="getSoftwareIcon(selectedSoftware.icon)" />
          </div>
          <div>
            <div class="sw-name large">{{ selectedSoftware.name }}</div>
            <div class="sw-desc">{{ selectedSoftware.description }}</div>
            <a-tag
              :color="selectedSoftware.installed ? 'success' : 'default'"
              style="margin-top: 4px"
            >
              {{ selectedSoftware.installed ? selectedSoftware.version || '已安装' : '未安装' }}
            </a-tag>
          </div>
        </div>

        <a-divider />

        <a-space direction="vertical" style="width: 100%" size="middle">
          <a-button
            v-if="!selectedSoftware.installed"
            type="primary"
            block
            :loading="
              isTaskRunning &&
              currentTask?.softwareId === selectedSoftware.id &&
              currentTask?.action === 'install'
            "
            :disabled="isTaskRunning"
            @click="handleAction(selectedSoftware, 'install')"
          >
            <template #icon><DownloadOutlined /></template>
            安装 {{ selectedSoftware.name }}
          </a-button>

          <template v-if="selectedSoftware.installed">
            <a-button
              type="primary"
              block
              :loading="
                isTaskRunning &&
                currentTask?.softwareId === selectedSoftware.id &&
                currentTask?.action === 'upgrade'
              "
              :disabled="isTaskRunning"
              @click="handleAction(selectedSoftware, 'upgrade')"
            >
              <template #icon><ArrowUpOutlined /></template>
              升级
            </a-button>

            <a-button
              v-if="selectedSoftware.configPaths.length > 0"
              block
              @click="openConfigModal(selectedSoftware)"
            >
              <template #icon><SettingOutlined /></template>
              查看/修改配置
            </a-button>

            <a-popconfirm
              :title="`确定卸载 ${selectedSoftware.name}？此操作不可撤销。`"
              @confirm="handleAction(selectedSoftware, 'uninstall')"
              ok-text="确定"
              cancel-text="取消"
            >
              <a-button
                danger
                block
                :loading="
                  isTaskRunning &&
                  currentTask?.softwareId === selectedSoftware.id &&
                  currentTask?.action === 'uninstall'
                "
                :disabled="isTaskRunning"
              >
                <template #icon><DeleteOutlined /></template>
                卸载
              </a-button>
            </a-popconfirm>
          </template>
        </a-space>

        <!-- Task progress -->
        <template v-if="currentTask && currentTask.softwareId === selectedSoftware.id">
          <a-divider />
          <div class="task-progress-section">
            <div class="task-title">
              {{ actionLabel(currentTask.action) }} {{ currentTask.softwareName }}
              <a-tag v-if="currentTask.status === 'running'" color="processing">进行中</a-tag>
              <a-tag v-else-if="currentTask.status === 'success'" color="success">完成</a-tag>
              <a-tag v-else-if="currentTask.status === 'error'" color="error">失败</a-tag>
            </div>

            <a-progress
              v-if="currentTask.status === 'running'"
              :percent="taskProgress"
              status="active"
              size="small"
              style="margin: 8px 0"
            />

            <a-collapse size="small" class="task-steps-collapse">
              <a-collapse-panel
                v-for="(step, idx) in currentTask.steps"
                :key="idx"
                :collapsible="step.logs.length > 0 ? undefined : 'disabled'"
              >
                <template #header>
                  <div class="step-header">
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
                    <span style="margin-left: 8px">{{ step.title }}</span>
                  </div>
                </template>
                <div class="step-logs" v-if="step.logs.length > 0">
                  <div
                    v-for="(log, logIdx) in step.logs"
                    :key="logIdx"
                    class="log-line"
                    :class="{ 'log-success': log.includes('✓'), 'log-error': log.includes('✗') }"
                  >
                    {{ log }}
                  </div>
                </div>
              </a-collapse-panel>
            </a-collapse>

            <a-alert
              v-if="currentTask.status === 'error'"
              :message="currentTask.error"
              type="error"
              show-icon
              style="margin-top: 12px"
            />
          </div>
        </template>
      </template>
    </a-drawer>

    <!-- Config modal -->
    <a-modal
      v-model:open="configModalVisible"
      :title="`配置文件 - ${configSoftware?.name || ''}`"
      width="720px"
      :footer="null"
    >
      <template v-if="configSoftware">
        <a-tabs v-model:activeKey="activeConfigPath" size="small">
          <a-tab-pane
            v-for="cp in configSoftware.configPaths"
            :key="cp"
            :tab="cp.split('/').pop()"
          />
        </a-tabs>

        <a-spin :spinning="loadingConfig">
          <a-textarea
            v-model:value="configContent"
            :auto-size="{ minRows: 15, maxRows: 25 }"
            class="config-editor"
          />
        </a-spin>

        <div class="config-actions">
          <a-space>
            <a-button @click="loadConfig">
              <template #icon><ReloadOutlined /></template>
              重新加载
            </a-button>
            <a-button type="primary" :loading="savingConfig" @click="handleSaveConfig">
              <template #icon><SaveOutlined /></template>
              保存配置
            </a-button>
          </a-space>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
  DownloadOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  SettingOutlined,
  SaveOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  CodeOutlined,
  DatabaseOutlined,
  BoxPlotOutlined,
  DashboardOutlined,
  BranchesOutlined
} from '@ant-design/icons-vue'
import {
  serverApi,
  type SoftwareInfo,
  type SoftwareTask,
  type SoftwareAction,
  type SoftwareMessage
} from '@/services/api'
import { wsService } from '@/services/websocket'

const loadingStatus = ref(false)
const softwareList = ref<SoftwareInfo[]>([])
const selectedSoftware = ref<SoftwareInfo | null>(null)
const actionDrawerVisible = ref(false)
const currentTask = ref<SoftwareTask | null>(null)

// Config state
const configModalVisible = ref(false)
const configSoftware = ref<SoftwareInfo | null>(null)
const activeConfigPath = ref('')
const configContent = ref('')
const loadingConfig = ref(false)
const savingConfig = ref(false)

// Icon mapping from software id to antd icon component
const iconMap: Record<string, typeof GlobalOutlined> = {
  nginx: GlobalOutlined,
  nodejs: CodeOutlined,
  mysql: DatabaseOutlined,
  pnpm: BoxPlotOutlined,
  pm2: DashboardOutlined,
  git: BranchesOutlined
}

const getSoftwareIcon = (icon: string) => {
  return iconMap[icon] || CodeOutlined
}

const installedList = computed(() => softwareList.value.filter(s => s.installed))
const notInstalledList = computed(() => softwareList.value.filter(s => !s.installed))
const isTaskRunning = computed(() => currentTask.value?.status === 'running')

const taskProgress = computed(() => {
  if (!currentTask.value) return 0
  const steps = currentTask.value.steps
  const done = steps.filter(s => s.status === 'success').length
  const running = steps.find(s => s.status === 'running')
  const base = (done / steps.length) * 100
  return Math.round(running ? base + 100 / steps.length / 2 : base)
})

function actionLabel(action: SoftwareAction): string {
  const labels: Record<SoftwareAction, string> = {
    install: '安装',
    uninstall: '卸载',
    upgrade: '升级'
  }
  return labels[action]
}

const loadSoftwareStatus = async () => {
  loadingStatus.value = true
  try {
    const { software } = await serverApi.getSoftwareStatus()
    softwareList.value = software

    // Sync selected software state if drawer is open
    if (selectedSoftware.value) {
      const current = selectedSoftware.value
      if (current) {
        const updated = software.find(s => s.id === current.id)
        if (updated) selectedSoftware.value = updated
      }
    }
  } catch (error) {
    console.error('Failed to load software status:', error)
    message.error('获取软件状态失败')
  } finally {
    loadingStatus.value = false
  }
}

const showActions = (sw: SoftwareInfo) => {
  selectedSoftware.value = sw
  actionDrawerVisible.value = true
}

const handleAction = async (sw: SoftwareInfo, action: SoftwareAction) => {
  try {
    currentTask.value = null
    await serverApi.executeSoftwareAction(sw.id, action)
    message.info(`${actionLabel(action)} ${sw.name} 任务已启动`)
  } catch (error) {
    const msg = error instanceof Error ? error.message : '操作失败'
    message.error(msg)
  }
}

// Config operations
const openConfigModal = (sw: SoftwareInfo) => {
  configSoftware.value = sw
  activeConfigPath.value = sw.configPaths[0] || ''
  configModalVisible.value = true
  loadConfig()
}

const loadConfig = async () => {
  if (!configSoftware.value || !activeConfigPath.value) return
  loadingConfig.value = true
  try {
    const result = await serverApi.getSoftwareConfig(
      configSoftware.value.id,
      activeConfigPath.value
    )
    configContent.value = result.content
  } catch (error) {
    const msg = error instanceof Error ? error.message : '读取配置失败'
    message.error(msg)
    configContent.value = ''
  } finally {
    loadingConfig.value = false
  }
}

watch(activeConfigPath, () => {
  if (configModalVisible.value) loadConfig()
})

const handleSaveConfig = async () => {
  if (!configSoftware.value || !activeConfigPath.value) return
  savingConfig.value = true
  try {
    await serverApi.updateSoftwareConfig(
      configSoftware.value.id,
      activeConfigPath.value,
      configContent.value
    )
    message.success('配置已保存并重启服务')
  } catch (error) {
    const msg = error instanceof Error ? error.message : '保存配置失败'
    message.error(msg)
  } finally {
    savingConfig.value = false
  }
}

// WebSocket listener for software task progress
function handleWsMessage(data: unknown) {
  const msg = data as SoftwareMessage
  if (
    msg.type === 'software:progress' ||
    msg.type === 'software:complete' ||
    msg.type === 'software:error'
  ) {
    currentTask.value = msg.task

    if (msg.type === 'software:complete') {
      message.success(`${actionLabel(msg.task.action)} ${msg.task.softwareName} 完成`)
      loadSoftwareStatus()
    } else if (msg.type === 'software:error') {
      message.error(`${actionLabel(msg.task.action)} ${msg.task.softwareName} 失败`)
    }
  }
}

let unsubscribe: (() => void) | null = null

onMounted(() => {
  loadSoftwareStatus()
  unsubscribe = wsService.onMessage(handleWsMessage)
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<style scoped>
.software-tab {
  padding: 4px 0;
}

.software-toolbar {
  margin-bottom: 16px;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: #8c8c8c;
  margin-bottom: 12px;
  padding-left: 4px;
}

.software-card {
  border-radius: 8px;
  transition: all 0.2s;
}

.software-card.installed {
  border-color: #b7eb8f;
}

.software-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.software-card :deep(.ant-card-body) {
  padding: 16px;
}

.card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}

.sw-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.sw-icon.large {
  width: 64px;
  height: 64px;
  font-size: 32px;
  border-radius: 16px;
}

.sw-icon.dimmed {
  opacity: 0.6;
}

.sw-info {
  min-width: 0;
}

.sw-name {
  font-weight: 600;
  font-size: 15px;
  color: #1f1f1f;
}

.sw-name.large {
  font-size: 18px;
}

.sw-desc {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.sw-status {
  margin-top: 2px;
}

/* Drawer header */
.drawer-header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Task progress */
.task-progress-section {
  margin-top: 8px;
}

.task-title {
  font-weight: 500;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-steps-collapse :deep(.ant-collapse-header) {
  padding: 6px 12px !important;
}

.step-header {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.step-logs {
  max-height: 150px;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 8px 12px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 11px;
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

/* Config modal */
.config-editor {
  font-family: 'Fira Code', Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: #1e1e1e;
  color: #d4d4d4;
  border: none;
  resize: none;
  border-radius: 4px;
}

.config-editor:focus {
  box-shadow: none;
}

.config-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
