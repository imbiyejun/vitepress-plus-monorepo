/// <reference types="vite/client" />
/// <reference types="vue/macros-global" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@ant-design/icons-vue' {
  import type { DefineComponent } from 'vue'
  export const LeftOutlined: DefineComponent
  export const RightOutlined: DefineComponent
  export const AppstoreOutlined: DefineComponent
  export const HomeOutlined: DefineComponent
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // 在这里添加其他环境变量
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
