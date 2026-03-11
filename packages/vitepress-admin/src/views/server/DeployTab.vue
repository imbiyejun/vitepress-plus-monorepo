<template>
  <div class="deploy-tab">
    <a-alert
      message="部署说明"
      description="一键构建并发布 VitePress 项目到私有 Nginx 服务器。部署流程：构建项目 → 打包压缩 → 上传服务器 → 备份旧版本 → 解压部署。"
      type="info"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-spin :spinning="loading">
      <template v-if="!deployStatus.configured">
        <a-result status="warning" title="部署未配置">
          <template #subTitle>
            <p>请在 .env 文件中配置以下变量：</p>
            <div class="config-hint">
              <pre>
DEPLOY_HOST=your_server_ip
DEPLOY_PORT=22
DEPLOY_USERNAME=your_username
DEPLOY_PASSWORD=your_password
DEPLOY_REMOTE_PATH=/var/www/html</pre
              >
            </div>
          </template>
        </a-result>
      </template>

      <template v-else>
        <div class="section-title">服务器配置（只读）</div>
        <a-descriptions bordered :column="1" size="small">
          <a-descriptions-item label="服务器地址">
            <div class="host-display">
              <span>{{ showHost ? deployStatus.host : maskHost(deployStatus.host) }}</span>
              <a-button type="text" size="small" @click="showHost = !showHost">
                <template #icon>
                  <EyeOutlined v-if="!showHost" />
                  <EyeInvisibleOutlined v-else />
                </template>
              </a-button>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="远程路径">
            {{ deployStatus.remotePath }}
          </a-descriptions-item>
        </a-descriptions>

        <div class="action-section">
          <a-space direction="vertical" size="middle" style="width: 100%">
            <a-button
              type="default"
              :loading="testingConnection"
              :disabled="isDeploying"
              @click="handleTestConnection"
            >
              <template #icon><ApiOutlined /></template>
              测试连接
            </a-button>

            <a-button
              type="primary"
              size="large"
              :loading="isDeploying"
              :disabled="isDeploying"
              @click="handleDeploy"
            >
              <template #icon><CloudUploadOutlined /></template>
              {{ isDeploying ? '部署中...' : '一键部署' }}
            </a-button>
          </a-space>
        </div>

        <template v-if="currentTask">
          <div class="section-title">部署进度</div>

          <div class="deploy-progress-header" v-if="currentTask.status === 'running'">
            <a-progress
              :percent="overallProgress"
              status="active"
              :stroke-color="{ from: '#108ee9', to: '#87d068' }"
            />
            <div class="elapsed-time">已用时: {{ formatElapsedTime(currentTask.startTime) }}</div>
          </div>

          <a-collapse v-model:activeKey="activeStepKeys" class="deploy-steps-collapse">
            <a-collapse-panel
              v-for="step in currentTask.steps"
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
                <a-tag v-else-if="step.status === 'success'" color="success">
                  {{ step.message || '完成' }}
                </a-tag>
                <a-tag v-else-if="step.status === 'error'" color="error">失败</a-tag>
                <a-tag v-else color="default">等待</a-tag>
              </template>
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
              <div v-else class="step-logs-empty">暂无日志</div>
            </a-collapse-panel>
          </a-collapse>

          <template v-if="currentTask.status === 'success'">
            <div class="deploy-result">
              <a-result status="success" title="部署成功">
                <template #subTitle>
                  <p v-if="currentTask.result?.zipSize">
                    压缩包大小: {{ currentTask.result.zipSize }}
                  </p>
                  <p v-if="currentTask.result?.remotePath">
                    部署路径: {{ currentTask.result.remotePath }}
                  </p>
                  <p v-if="currentTask.result?.backupPath">
                    备份路径: {{ currentTask.result.backupPath }}
                  </p>
                  <p>耗时: {{ formatDuration(currentTask.endTime! - currentTask.startTime) }}</p>
                </template>
              </a-result>
            </div>
          </template>

          <template v-if="currentTask.status === 'error'">
            <div class="deploy-result">
              <a-result status="error" title="部署失败">
                <template #subTitle
                  ><p>{{ currentTask.error }}</p></template
                >
              </a-result>
            </div>
          </template>
        </template>
      </template>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  CloudUploadOutlined,
  ApiOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons-vue'
import {
  deployApi,
  type DeployStatus,
  type DeployTask,
  type DeployStep,
  type DeployMessage
} from '@/services/api'
import { wsService } from '@/services/websocket'

const loading = ref(false)
const testingConnection = ref(false)
const showHost = ref(false)
const activeStepKeys = ref<string[]>([])
const deployStatus = ref<DeployStatus>({ configured: false })
const currentTask = ref<DeployTask | null>(null)

const isDeploying = computed(() => currentTask.value?.status === 'running')

const overallProgress = computed(() => {
  if (!currentTask.value) return 0
  const steps = currentTask.value.steps
  const completed = steps.filter(s => s.status === 'success').length
  const running = steps.find(s => s.status === 'running')
  const progress = (completed / steps.length) * 100
  return Math.round(running ? progress + 100 / steps.length / 2 : progress)
})

function maskHost(host?: string): string {
  if (!host) return '***'
  const parts = host.split('.')
  if (parts.length === 4) return `${parts[0]}.***.***. ${parts[3]}`
  if (host.includes('.')) {
    const domainParts = host.split('.')
    if (domainParts.length >= 2)
      return `${domainParts[0]}.***.${domainParts[domainParts.length - 1]}`
  }
  return '***'
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes} 分 ${remainingSeconds} 秒`
}

function formatElapsedTime(startTime: number): string {
  return formatDuration(Date.now() - startTime)
}

function formatStepDuration(step: DeployStep): string {
  if (!step.startTime) return ''
  const endTime = step.endTime || Date.now()
  const seconds = Math.round((endTime - step.startTime) / 1000)
  return seconds > 0 ? `${seconds}s` : ''
}

const loadStatus = async () => {
  loading.value = true
  try {
    const [status, taskResult] = await Promise.all([
      deployApi.getStatus(),
      deployApi.getTaskStatus()
    ])
    deployStatus.value = status
    if (taskResult.task) currentTask.value = taskResult.task
  } catch (error) {
    console.error('Failed to load deploy status:', error)
    message.error('加载部署配置失败')
  } finally {
    loading.value = false
  }
}

const handleTestConnection = async () => {
  testingConnection.value = true
  try {
    await deployApi.testConnection()
    message.success('连接成功')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '连接失败'
    message.error(errorMessage)
  } finally {
    testingConnection.value = false
  }
}

const handleDeploy = async () => {
  try {
    currentTask.value = null
    activeStepKeys.value = []
    await deployApi.startDeploy()
    message.info('部署任务已启动')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '启动部署失败'
    message.error(errorMessage)
  }
}

function handleWsMessage(data: unknown) {
  const msg = data as DeployMessage
  if (
    msg.type === 'deploy:progress' ||
    msg.type === 'deploy:complete' ||
    msg.type === 'deploy:error'
  ) {
    currentTask.value = msg.task
    const runningStep = msg.task.steps.find(s => s.status === 'running')
    if (runningStep && !activeStepKeys.value.includes(runningStep.id)) {
      activeStepKeys.value = [runningStep.id]
    }
    if (msg.type === 'deploy:complete') {
      message.success('部署成功')
      activeStepKeys.value = []
    } else if (msg.type === 'deploy:error') {
      message.error(`部署失败: ${msg.task.error}`)
    }
  }
}

let unsubscribe: (() => void) | null = null

onMounted(() => {
  loadStatus()
  unsubscribe = wsService.onMessage(handleWsMessage)
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<style scoped>
.deploy-tab {
  max-width: 800px;
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  margin: 20px 0 12px;
  color: #1f1f1f;
  border-left: 4px solid #1890ff;
  padding-left: 12px;
}

.section-title:first-child {
  margin-top: 0;
}

.host-display {
  display: flex;
  align-items: center;
  gap: 8px;
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

.action-section {
  margin-top: 20px;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
}

.deploy-progress-header {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.elapsed-time {
  text-align: right;
  color: #666;
  font-size: 13px;
  margin-top: 8px;
}

.deploy-steps-collapse {
  background: #fafafa;
  border-radius: 8px;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-icon {
  display: flex;
  align-items: center;
  font-size: 16px;
}

.step-title {
  font-weight: 500;
}

.step-duration {
  margin-left: auto;
  color: #999;
  font-size: 12px;
}

.step-logs {
  max-height: 200px;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
}

.log-line {
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-line.log-success {
  color: #4ec9b0;
}
.log-line.log-error {
  color: #f48771;
}

.step-logs-empty {
  color: #999;
  font-size: 13px;
  text-align: center;
  padding: 12px;
}

.deploy-result {
  margin-top: 16px;
}
</style>
