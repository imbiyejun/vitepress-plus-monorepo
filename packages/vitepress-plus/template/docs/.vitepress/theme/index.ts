import Theme from 'vitepress/theme'
import type { EnhanceAppContext, Theme as ThemeConfig } from 'vitepress'
import Layout from './Layout.vue'
import { Row, Col, ConfigProvider, Tag } from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import './custom.css'

export default {
  ...Theme,
  Layout,
  enhanceApp(ctx: EnhanceAppContext) {
    // Call default theme enhanceApp
    Theme.enhanceApp?.(ctx)

    // Register Ant Design Vue components
    ctx.app.component('ARow', Row)
    ctx.app.component('ACol', Col)
    ctx.app.component('ATag', Tag)
    ctx.app.component('AConfigProvider', ConfigProvider)
  }
} as ThemeConfig

