<template>
  <a-layout-sider
    v-model:collapsed="collapsed"
    :trigger="null"
    collapsible
    class="sider"
    :width="240"
  >
    <div class="logo">
      <div class="logo-content">
        <BookOutlined style="font-size: 24px; color: #fff" />
        <span v-if="!collapsed" class="logo-text">Mind Palace</span>
      </div>
      <div class="collapse-trigger" @click="toggleCollapse">
        <MenuFoldOutlined v-if="!collapsed" />
        <MenuUnfoldOutlined v-else />
      </div>
    </div>
    <a-menu
      v-model:selectedKeys="selectedKeys"
      v-model:openKeys="openKeys"
      mode="inline"
      theme="dark"
    >
      <template v-for="mainRoute in mainRoutes" :key="mainRoute.name">
        <!-- 没有子路由的菜单项 -->
        <a-menu-item
          v-if="!mainRoute.children"
          :key="mainRoute.name"
          @click="handleMenuClick(mainRoute)"
        >
          <template #icon>
            <component :is="getIcon((mainRoute.meta as RouteMeta)?.icon)" />
          </template>
          <span>{{ (mainRoute.meta as RouteMeta)?.title }}</span>
        </a-menu-item>

        <!-- 有子路由的菜单项 -->
        <template v-else>
          <a-sub-menu :key="mainRoute.name" @titleClick="() => handleSubMenuClick(mainRoute)">
            <template #icon>
              <component :is="getIcon((mainRoute.meta as RouteMeta)?.icon)" />
            </template>
            <template #title>{{ (mainRoute.meta as RouteMeta)?.title }}</template>

            <template v-if="mainRoute.children">
              <a-menu-item
                v-for="child in mainRoute.children"
                :key="child.name"
                @click="handleMenuClick(child)"
              >
                <template #icon>
                  <component :is="getIcon((child.meta as RouteMeta)?.icon)" />
                </template>
                <span>{{ (child.meta as RouteMeta)?.title }}</span>
              </a-menu-item>
            </template>
          </a-sub-menu>
        </template>
      </template>
    </a-menu>
  </a-layout-sider>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute, RouteRecordRaw } from 'vue-router'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  BookOutlined,
  PictureOutlined,
  FileTextOutlined
} from '@ant-design/icons-vue'

interface RouteMeta {
  title?: string
  icon?: string
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const router = useRouter()
const route = useRoute()

// 从 localStorage 读取初始折叠状态
const STORAGE_KEY = 'sidebar_collapsed'
const initCollapsed = localStorage.getItem(STORAGE_KEY) === 'true'
emit('update:modelValue', initCollapsed)

const collapsed = computed({
  get: () => props.modelValue,
  set: value => {
    emit('update:modelValue', value)
    // 保存折叠状态到 localStorage
    localStorage.setItem(STORAGE_KEY, value.toString())
  }
})

const selectedKeys = ref<string[]>([])
const openKeys = ref<string[]>([])

// 图标组件映射
const icons = {
  HomeOutlined,
  BookOutlined,
  PictureOutlined,
  FileTextOutlined
} as const

// 获取图标组件
const getIcon = (iconName?: string) => {
  if (!iconName) return BookOutlined
  return (icons as Record<string, typeof BookOutlined>)[iconName] || BookOutlined
}

// 主路由列表
const mainRoutes = computed(() => {
  const children = router.options.routes[0].children || []
  return children as RouteRecordRaw[]
})

// 切换折叠状态
const toggleCollapse = () => {
  collapsed.value = !collapsed.value
  // 折叠时清空展开的菜单
  if (collapsed.value) {
    openKeys.value = []
  } else {
    // 展开时，如果当前路由是子路由，则展开父级菜单
    const routeName = route.name as string
    const parentRoute = mainRoutes.value.find(route =>
      route.children?.some(
        child =>
          child.name === routeName ||
          child.children?.some(grandChild => grandChild.name === routeName)
      )
    )
    if (parentRoute) {
      openKeys.value = [parentRoute.name as string]
    }
  }
}

// 处理菜单点击
const handleMenuClick = (route: RouteRecordRaw) => {
  // 如果点击的是当前路由，保持当前的查询参数
  if (route.name === router.currentRoute.value.name) {
    return
  }
  router.push({ name: route.name as string })
}

// 处理子菜单点击
const handleSubMenuClick = (route: RouteRecordRaw) => {
  // 如果点击的是当前路由，保持当前的查询参数
  if (route.name === router.currentRoute.value.name) {
    return
  }
  if (route.name === 'topics' && !route.redirect) {
    router.push('/topics')
  }
}

// 监听路由变化，更新选中的菜单项
watch(
  () => route.path,
  newPath => {
    if (newPath) {
      // 根据路径选择对应的菜单项
      const routeName = route.name as string

      // 特殊处理图片列表子路由
      if (['local-images', 'qiniu-images'].includes(routeName)) {
        selectedKeys.value = ['imageList']
      } else {
        selectedKeys.value = [routeName]
      }

      // 如果是子路由且侧边栏未折叠，才打开父级菜单
      const parentRoute = mainRoutes.value.find(route =>
        route.children?.some(
          child =>
            child.name === routeName ||
            child.children?.some(grandChild => grandChild.name === routeName)
        )
      )
      if (parentRoute && !collapsed.value) {
        openKeys.value = [parentRoute.name as string]
      }
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.sider {
  position: relative;
}

.logo {
  height: 64px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-text {
  color: #fff;
  font-size: 18px;
  font-weight: 500;
}

.collapse-trigger {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.65);
  transition: color 0.3s;
}

.collapse-trigger:hover {
  color: #fff;
}

.collapse-trigger :deep(.anticon) {
  font-size: 16px;
}

:deep(.ant-menu-dark) {
  background: #001529;
}

:deep(.ant-menu-dark .ant-menu-sub) {
  background: #000c17;
}

:deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
}

:deep(.ant-menu) {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 自定义滚动条样式 */
:deep(.ant-menu::-webkit-scrollbar) {
  width: 6px;
}

:deep(.ant-menu::-webkit-scrollbar-thumb) {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

:deep(.ant-menu::-webkit-scrollbar-track) {
  background: transparent;
}
</style>
