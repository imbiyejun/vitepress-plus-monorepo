<template>
  <div class="image-settings">
    <div class="settings-header">
      <div class="header-content">
        <h2>图床设置（只读）</h2>
      </div>
      <a-alert
        message="配置说明"
        description="图床配置从环境变量中读取。如需修改配置，请编辑 admin/.env 文件，然后重启服务器。"
        type="info"
        show-icon
        style="margin-top: 16px"
      />
    </div>
    <div class="settings-content">
      <a-form :label-col="{ span: 4 }" :wrapper-col="{ span: 16 }">
        <template v-if="qiniuConfig.bucket">
          <div class="section-title">七牛云配置（只读）</div>
          <a-form-item label="AccessKey">
            <a-input v-model:value="qiniuConfig.accessKey" placeholder="未配置" disabled />
            <template #extra>
              <span class="help-text">通过环境变量 QINIU_ACCESS_KEY 配置</span>
            </template>
          </a-form-item>

          <a-form-item label="SecretKey">
            <a-input-password v-model:value="qiniuConfig.secretKey" placeholder="未配置" disabled />
            <template #extra>
              <span class="help-text">通过环境变量 QINIU_SECRET_KEY 配置</span>
            </template>
          </a-form-item>

          <a-form-item label="Bucket">
            <a-input v-model:value="qiniuConfig.bucket" placeholder="未配置" disabled />
            <template #extra>
              <span class="help-text">通过环境变量 QINIU_BUCKET 配置</span>
            </template>
          </a-form-item>

          <a-form-item label="访问网址">
            <a-input v-model:value="qiniuConfig.domain" placeholder="未配置" disabled />
            <template #extra>
              <span class="help-text">通过环境变量 QINIU_DOMAIN 配置</span>
            </template>
          </a-form-item>

          <a-form-item label="存储区域">
            <a-select v-model:value="qiniuConfig.region" placeholder="未配置" disabled>
              <a-select-option
                v-for="region in regionOptions"
                :key="region.value"
                :value="region.value"
              >
                {{ region.label }}（{{ region.value }}）
              </a-select-option>
            </a-select>
            <template #extra>
              <span class="help-text">通过环境变量 QINIU_REGION 配置</span>
            </template>
          </a-form-item>

          <a-form-item label="网址后缀">
            <a-input v-model:value="qiniuConfig.urlSuffix" placeholder="未配置" disabled />
            <template #extra>
              <span class="help-text">通过环境变量 QINIU_URL_SUFFIX 配置</span>
            </template>
          </a-form-item>

          <a-form-item label="存储路径">
            <a-input v-model:value="qiniuConfig.path" placeholder="未配置" disabled />
            <template #extra>
              <span class="help-text">通过环境变量 QINIU_PATH 配置</span>
            </template>
          </a-form-item>

          <a-form-item :wrapper-col="{ offset: 4 }">
            <a-space>
              <a-button
                type="default"
                :loading="testing"
                :disabled="!isQiniuConfigValid"
                @click="testQiniuUpload"
              >
                测试上传
              </a-button>
              <span v-if="!isQiniuConfigValid" class="help-text">请先配置完整的七牛云信息</span>
            </a-space>
          </a-form-item>
        </template>

        <div class="section-title">本地存储配置（只读）</div>
        <a-form-item label="存储路径">
          <a-input v-model:value="localConfig.path" placeholder="未配置" disabled />
          <template #extra>
            <span class="help-text">通过环境变量 LOCAL_STORAGE_PATH 配置</span>
          </template>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { imageApi } from '@/services/api'

// Type definitions
interface QiniuConfig {
  accessKey: string
  secretKey: string
  bucket: string
  domain: string
  region: 'z0' | 'z1' | 'z2' | 'na0' | 'as0'
  urlSuffix?: string
  path?: string
}

interface LocalConfig {
  path: string
}

interface RegionOption {
  value: 'z0' | 'z1' | 'z2' | 'na0' | 'as0'
  label: string
}

// Reactive state
const testing = ref(false)

// Qiniu configuration (read-only from env)
const qiniuConfig = ref<QiniuConfig>({
  accessKey: '',
  secretKey: '',
  bucket: '',
  domain: '',
  region: 'z0',
  urlSuffix: '',
  path: ''
})

// Local storage configuration (read-only from env)
const localConfig = ref<LocalConfig>({
  path: 'public/images'
})

// Region options
const regionOptions: RegionOption[] = [
  { value: 'z0', label: '华东' },
  { value: 'z1', label: '华北' },
  { value: 'z2', label: '华南' },
  { value: 'na0', label: '北美' },
  { value: 'as0', label: '东南亚' }
]

// Check if Qiniu config is valid
const isQiniuConfigValid = computed(() => {
  return !!(
    qiniuConfig.value.accessKey &&
    qiniuConfig.value.secretKey &&
    qiniuConfig.value.bucket &&
    qiniuConfig.value.domain &&
    qiniuConfig.value.region
  )
})

// Test Qiniu upload
const testQiniuUpload = async () => {
  if (!isQiniuConfigValid.value) {
    message.error('七牛云配置信息不完整，请先在 .env 文件中配置')
    return
  }

  testing.value = true
  try {
    await imageApi.testQiniuUpload({
      accessKey: qiniuConfig.value.accessKey,
      secretKey: qiniuConfig.value.secretKey,
      bucket: qiniuConfig.value.bucket,
      domain: qiniuConfig.value.domain,
      region: qiniuConfig.value.region,
      urlSuffix: qiniuConfig.value.urlSuffix || '',
      path: qiniuConfig.value.path || ''
    })
    message.success('测试上传成功！')
  } catch (error) {
    console.error('测试上传失败:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    message.error({
      content: errorMessage,
      duration: 8
    })
  } finally {
    testing.value = false
  }
}

// Load config from server
const loadConfig = async () => {
  try {
    const config = await imageApi.getImageConfig()

    if (config.qiniuStorage) {
      qiniuConfig.value = {
        accessKey: config.qiniuStorage.accessKey || '',
        secretKey: config.qiniuStorage.secretKey || '',
        bucket: config.qiniuStorage.bucket || '',
        domain: config.qiniuStorage.domain || '',
        region: config.qiniuStorage.region || 'z0',
        urlSuffix: config.qiniuStorage.urlSuffix || '',
        path: config.qiniuStorage.path || ''
      }
    }

    localConfig.value = config.localStorage || { path: 'public/images' }
  } catch (error) {
    console.error('加载配置失败:', error)
    message.error('加载配置失败')
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.image-settings {
  height: 100%;
}

.settings-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.storage-type-tag {
  font-size: 14px;
}

.settings-content {
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

.help-text {
  color: #666;
  font-size: 13px;
}
</style>
