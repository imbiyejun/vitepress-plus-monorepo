<template>
  <div class="theme-container">
    <a-config-provider :theme="themeConfig">
      <Layout>
        <template #doc-before>
          <ArticleStatusTag />
        </template>
      </Layout>
    </a-config-provider>
  </div>
</template>

<script setup>
import { watch, onMounted, computed } from 'vue'
import Layout from 'vitepress/dist/client/theme-default/Layout.vue'
import ArticleStatusTag from '../components/ArticleStatusTag.vue'
import { useData } from 'vitepress'
import { theme } from 'ant-design-vue'

const { isDark, page } = useData()

// 配置主题
const themeConfig = computed(() => ({
  algorithm: isDark.value ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    borderRadius: 6,
    colorPrimary: '#1677ff'
  }
}))

// Update theme - only runs on client side
const updateTheme = isDarkMode => {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  if (isDarkMode) {
    html.setAttribute('data-theme', 'dark')
  } else {
    html.setAttribute('data-theme', 'light')
  }
}

// Watch theme changes - only on client side
onMounted(() => {
  updateTheme(isDark.value)

  watch(isDark, newVal => {
    updateTheme(newVal)
  })
})
</script>

<style scoped>
.theme-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

:deep(.vp-doc) {
  flex: 1;
}

:deep(.vp-doc .topic-detail-container) {
  max-width: none;
  padding: 0;
  margin: 0;
}
</style>
