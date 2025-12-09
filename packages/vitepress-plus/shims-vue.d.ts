// 为 Vitepress 组件声明类型
declare module 'vitepress/theme' {
  import type { ComponentOptions } from 'vue'
  export const Layout: ComponentOptions
}

// 为 Ant Design Vue 组件声明类型
declare module 'ant-design-vue' {
  import type { ComponentOptions } from 'vue'

  interface ButtonProps {
    type?: 'primary' | 'default' | 'dashed' | 'text' | 'link'
    size?: 'large' | 'middle' | 'small'
    loading?: boolean | { delay?: number }
    disabled?: boolean
    icon?: ComponentOptions
  }

  export const Button: ComponentOptions<ButtonProps>
  export const Breadcrumb: ComponentOptions
  export const BreadcrumbItem: ComponentOptions
}
