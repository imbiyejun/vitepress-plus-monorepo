# @imbiyejun/vitepress-plus

增强版 VitePress 文档模板，提供专题管理、文章状态标记等扩展功能。

## ✨ 特性

- 📚 **专题管理** - 按专题组织文档，支持分类和章节
- 🏷️ **文章状态** - 标记文章状态（草稿、计划、已完成）
- 🎨 **自定义组件** - TopicDetail、TopicsDisplay、ArticleStatusTag
- 🎯 **自动导航** - 根据专题配置自动生成导航和侧边栏
- 🔧 **完全兼容** - 100% 兼容原生 VitePress 配置

## 📦 安装

```bash
npm install @imbiyejun/vitepress-plus
# or
pnpm add @imbiyejun/vitepress-plus
```

## 🚀 快速开始

### 1. 基础使用

在你的 VitePress 项目中，修改 `.vitepress/config.ts`：

```typescript
import { defineConfig } from 'vitepress'
// TODO: 后续实现配置加载器
```

### 2. 创建专题配置

在 `.vitepress/topics/config/index.ts` 中定义专题：

```typescript
export const topics = [
  {
    id: 'frontend',
    title: '前端开发',
    items: [
      {
        id: 'vue',
        name: 'Vue.js',
        slug: 'vue',
        description: 'Vue.js 学习笔记'
      }
    ]
  }
]
```

## 📖 文档

更多详细文档请访问 [文档站点](https://github.com)。

## 📄 许可证

MIT

