<template>
  <div class="image-container">
    <div class="image-header">
      <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
        <a-tab-pane key="local" :tab="storageTypeLabel('local')" />
        <a-tab-pane key="qiniu" :tab="storageTypeLabel('qiniu')" />
      </a-tabs>
    </div>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 根据路由参数设置初始 tab
const activeTab = ref(route.name === 'qiniu-images' ? 'qiniu' : 'local')

// 处理 tab 切换
const handleTabChange = (key: string) => {
  if (key === 'local') {
    router.push({ name: 'local-images' })
  } else {
    router.push({ name: 'qiniu-images' })
  }
}

// 存储类型标签
const storageTypeLabel = (type: 'local' | 'qiniu') => {
  return type === 'local' ? '本地图片' : '七牛云图片'
}
</script>

<style scoped>
.image-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.image-header {
  margin-bottom: 16px;
}

:deep(.ant-tabs-nav) {
  margin-bottom: 0;
}
</style>
