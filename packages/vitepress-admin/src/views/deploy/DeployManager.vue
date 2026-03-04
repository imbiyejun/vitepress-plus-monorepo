<template>
  <div class="deploy-manager">
    <div class="deploy-header">
      <div class="header-content">
        <h2>一键部署</h2>
      </div>
      <a-alert
        message="部署说明"
        description="一键构建并发布 VitePress 项目到私有 Nginx 服务器。部署流程：构建项目 → 打包压缩 → 上传服务器 → 备份旧版本 → 解压部署。"
        type="info"
        show-icon
        style="margin-top: 16px"
      />
    </div>

    <div class="deploy-content">
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
          <a-descriptions bordered :column="1">
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

          <!-- Deploy Progress -->
          <template v-if="currentTask">
            <div class="section-title">部署进度</div>
            <div class="deploy-steps">
              <a-steps
                :current="currentStepIndex"
                :status="stepsStatus"
                direction="vertical"
                size="small"
              >
                <a-step
                  v-for="step in currentTask.steps"
                  :key="step.id"
                  :title="step.title"
                  :description="step.message"
                  :status="getStepStatus(step.status)"
                />
              </a-steps>
            </div>

            <!-- Deploy Result -->
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

            <!-- Deploy Error -->
            <template v-if="currentTask.status === 'error'">
              <div class="deploy-result">
                <a-result status="error" title="部署失败">
                  <template #subTitle>
                    <p>{{ currentTask.error }}</p>
                  </template>
                </a-result>
              </div>
            </template>
          </template>
        </template>
      </a-spin>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  CloudUploadOutlined,
  ApiOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons-vue'
import {
  deployApi,
  type DeployStatus,
  type DeployTask,
  type DeployMessage,
  type DeployStepStatus
} from '@/services/api'
import { wsService } from '@/services/websocket'

const loading = ref(false)
const testingConnection = ref(false)
const showHost = ref(false)

const deployStatus = ref<DeployStatus>({
  configured: false
})

const currentTask = ref<DeployTask | null>(null)

const isDeploying = computed(() => currentTask.value?.status === 'running')

const currentStepIndex = computed(() => {
  if (!currentTask.value) return -1
  const runningIndex = currentTask.value.steps.findIndex(s => s.status === 'running')
  if (runningIndex >= 0) return runningIndex
  const lastSuccessIndex = currentTask.value.steps.map(s => s.status).lastIndexOf('success')
  return lastSuccessIndex
})

const stepsStatus = computed(() => {
  if (!currentTask.value) return 'process'
  if (currentTask.value.status === 'error') return 'error'
  if (currentTask.value.status === 'success') return 'finish'
  return 'process'
})

// Mask IP address: 192.168.1.100 -> 192.***.***. 100
function maskHost(host?: string): string {
  if (!host) return '***'
  const parts = host.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.***.***. ${parts[3]}`
  }
  // For domain names, show first and last part
  if (host.includes('.')) {
    const domainParts = host.split('.')
    if (domainParts.length >= 2) {
      return `${domainParts[0]}.***.${domainParts[domainParts.length - 1]}`
    }
  }
  return '***'
}

function getStepStatus(status: DeployStepStatus): 'wait' | 'process' | 'finish' | 'error' {
  switch (status) {
    case 'pending':
      return 'wait'
    case 'running':
      return 'process'
    case 'success':
      return 'finish'
    case 'error':
      return 'error'
    default:
      return 'wait'
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes} 分 ${remainingSeconds} 秒`
}

const loadStatus = async () => {
  loading.value = true
  try {
    const [status, taskResult] = await Promise.all([
      deployApi.getStatus(),
      deployApi.getTaskStatus()
    ])
    deployStatus.value = status
    if (taskResult.task) {
      currentTask.value = taskResult.task
    }
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
    console.error('Connection test failed:', error)
    const errorMessage = error instanceof Error ? error.message : '连接失败'
    message.error(errorMessage)
  } finally {
    testingConnection.value = false
  }
}

const handleDeploy = async () => {
  try {
    currentTask.value = null
    await deployApi.startDeploy()
    message.info('部署任务已启动')
  } catch (error) {
    console.error('Start deploy failed:', error)
    const errorMessage = error instanceof Error ? error.message : '启动部署失败'
    message.error(errorMessage)
  }
}

// Handle WebSocket messages
function handleWsMessage(data: unknown) {
  const msg = data as DeployMessage
  if (
    msg.type === 'deploy:progress' ||
    msg.type === 'deploy:complete' ||
    msg.type === 'deploy:error'
  ) {
    currentTask.value = msg.task

    if (msg.type === 'deploy:complete') {
      message.success('部署成功')
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
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<style scoped>
.deploy-manager {
  height: 100%;
  padding: 24px;
}

.deploy-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.deploy-content {
  max-width: 800px;
  background: #fff;
  padding: 24px;
  border-radius: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  margin: 24px 0 16px;
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
  margin-top: 24px;
  padding: 24px;
  background: #fafafa;
  border-radius: 8px;
}

.deploy-steps {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.deploy-result {
  margin-top: 16px;
}
</style>
