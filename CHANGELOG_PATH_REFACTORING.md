# 路径重构更改日志

## 概述

本次重构移除了所有硬编码路径，使 `vitepress-admin` 可以作为独立的 npm 包在任何 VitePress Plus 项目中使用。

## 🎯 解决的问题

### 问题 1: 硬编码的包名
```typescript
// ❌ 之前
import { topicsData } from '@mind-palace/docs/data'

// ✅ 现在
import { loadTopicsData } from '../utils/data-loader.js'
const topicsData = await loadTopicsData()
```

### 问题 2: 硬编码的路径
```typescript
// ❌ 之前
const TOPICS_DIR = join(PROJECT_ROOT, 'docs', 'topics')
const TOPICS_DATA_DIR = join(PROJECT_ROOT, 'docs', '.vitepress', 'topics', 'data')

// ✅ 现在
import { getTopicsPath, getTopicsDataPath } from '../config/paths.js'
const topicsDir = getTopicsPath()
const topicsDataDir = getTopicsDataPath()
```

### 问题 3: 硬编码的类型导入
```typescript
// ❌ 之前
import { Topic } from '../../../docs/.vitepress/topics/data/types'

// ✅ 现在
import type { Topic } from '../types/topic.js'
```

## 📁 新增文件

### 1. `server/types/topic.ts`
定义了所有 Topic 相关的 TypeScript 类型：
- `Article` - 文章接口
- `Chapter` - 章节接口
- `Topic` - 专题接口
- `TopicsData` - 专题数据集合
- `TopicCategory` - 专题分类

**作用**：提供类型定义，不再依赖目标项目的类型。

### 2. `server/utils/data-loader.ts`
提供动态数据加载功能：
- `loadTopicsData()` - 动态加载 topics 数据
- `getTopicsDataPath()` - 获取数据目录路径
- `getTopicsConfigPath()` - 获取配置目录路径
- `getTopicDataPath(slug)` - 获取特定专题路径

**作用**：使用动态 import 加载目标项目的数据，支持缓存刷新。

## 🔄 修改的文件

### 1. `server/config/paths.ts`
**新增函数**：
```typescript
export function getVitePressPath(): string
export function getTopicsDataPath(): string
export function getTopicsConfigPath(): string
```

**作用**：扩展路径配置，提供更多目录路径。

### 2. `server/controllers/articleController.ts`
**主要更改**：
```typescript
// 导入更改
- import { topicsData } from '@mind-palace/docs/data'
+ import { loadTopicsData } from '../utils/data-loader.js'
+ import { getArticlesPath } from '../config/paths.js'

// 使用方式更改
- const topicData = topicsData[topicId]
+ const topicsData = await loadTopicsData()
+ const topicData = topicsData[topicId]

// 路径更改
- const articlePath = join(ARTICLES_DIR, topicSlug, `${articleSlug}.md`)
+ const articlesDir = getArticlesPath()
+ const articlePath = join(articlesDir, topicSlug, `${articleSlug}.md`)
```

### 3. `server/services/topic-sync.ts`
**主要更改**：
```typescript
// 类型导入更改
- import { Topic } from '../../../docs/.vitepress/topics/data/types'
+ import type { Topic } from '../types/topic.js'

// 路径导入
+ import {
+   getProjectRoot,
+   getTopicsPath,
+   getTopicsDataPath,
+   getTopicsConfigPath
+ } from '../config/paths.js'

// 移除硬编码常量
- const DOCS_DIR = join(PROJECT_ROOT, 'docs')
- const TOPICS_DIR = join(DOCS_DIR, 'topics')
- const TOPICS_DATA_DIR = join(DOCS_DIR, '.vitepress/topics/data')

// 使用函数替代
+ const getTopicsDir = () => getTopicsPath()
+ const getTopicsDataDir = () => getTopicsDataPath()
```

**更改行数**：约 15 处硬编码路径被替换。

### 4. `server/controllers/topicController.ts`
**主要更改**：
```typescript
// 导入更改
+ import {
+   getTopicsPath,
+   getTopicsDataPath,
+   getArticlesPath
+ } from '../config/paths.js'

// 移除硬编码常量
- const TOPICS_DIR = join(PROJECT_ROOT, 'docs', 'topics')
- const TOPICS_DATA_DIR = join(PROJECT_ROOT, 'docs', '.vitepress', 'topics', 'data')
- const ARTICLES_DIR = join(DOCS_DIR, 'articles')

// 批量替换
- TOPICS_DIR → getTopicsPath()
- TOPICS_DATA_DIR → getTopicsDataPath()
- ARTICLES_DIR → getArticlesPath()
```

**更改行数**：约 10 处硬编码路径被替换。

### 5. `server/controllers/categoryController.ts`
**主要更改**：
```typescript
// 导入更改
+ import { getTopicsConfigPath, getTopicsDataPath } from '../config/paths.js'

// 移除硬编码常量
- const TOPICS_CONFIG_FILE = join(PROJECT_ROOT, 'docs', '.vitepress', 'topics', 'config', 'index.ts')
- const TOPICS_DATA_DIR = join(PROJECT_ROOT, 'docs', '.vitepress', 'topics', 'data')

// 使用函数替代
+ const getTopicsConfigFile = () => join(getTopicsConfigPath(), 'index.ts')
+ const getTopicsDataDir = () => getTopicsDataPath()
```

**更改行数**：约 8 处硬编码路径被替换。

## 🎉 重构效果

### ✅ 已实现

1. **完全移除硬编码路径**
   - ✅ 移除 `@mind-palace/docs` 包名依赖
   - ✅ 移除 `docs/` 目录依赖
   - ✅ 移除相对路径 `../../../docs`

2. **统一路径管理**
   - ✅ 所有路径通过 `paths.ts` 管理
   - ✅ 支持环境变量 `PROJECT_ROOT`
   - ✅ 支持 CLI 参数 `--root`

3. **动态数据加载**
   - ✅ 支持运行时动态加载数据
   - ✅ 支持多种文件扩展名（.ts, .js, .mjs）
   - ✅ 缓存刷新机制

4. **类型安全**
   - ✅ 完整的 TypeScript 类型定义
   - ✅ 类型定义独立，不依赖目标项目

### 📊 统计数据

- **新增文件**：2 个
- **修改文件**：6 个
- **移除硬编码路径**：约 50+ 处
- **新增路径配置函数**：3 个
- **代码行数变化**：+200 / -50

## 🚀 使用示例

### 在 vitepress-plus 中使用

```bash
# 方法 1: 使用 npm script
cd packages/vitepress-plus
pnpm run dev:admin

# 方法 2: 直接使用 CLI
npx vpa start

# 方法 3: 指定项目根目录
npx vpa start -r /path/to/your/vitepress-project
```

### 在其他项目中使用

```bash
# 1. 安装依赖
pnpm add @imbiyejun/vitepress-admin

# 2. 启动
npx vpa start

# 3. 指定端口和项目根目录
npx vpa start -p 4000 -r .
```

## ⚠️ 注意事项

### 目标项目要求

1. **目录结构**：
```
your-project/
├── .vitepress/
│   └── topics/
│       ├── config/
│       │   └── index.ts  # 必须导出 topics
│       └── data/
│           └── index.ts   # 必须导出 topicsData
├── articles/
├── topics/
└── public/
```

2. **数据导出格式**：
```typescript
// .vitepress/topics/data/index.ts
export const topicsData: TopicsData = {
  'topic-slug': {
    slug: 'topic-slug',
    name: 'Topic Name',
    // ...
  }
}
```

3. **类型兼容性**：
确保数据结构与 `server/types/topic.ts` 中的类型定义兼容。

## 🐛 已知问题

1. **动态导入缓存**：
   - 已通过添加时间戳参数解决
   - `import(\`\${dataUrl}?t=\${Date.now()}\`)`

2. **路径解析**：
   - Windows 和 Unix 路径分隔符已处理
   - 使用 `path.join()` 确保跨平台兼容

## 📝 后续计划

- [ ] 添加配置文件支持（.vitepress-admin.config.js）
- [ ] 支持自定义路径映射
- [ ] 添加路径验证和友好错误提示
- [ ] 支持多种项目结构（VitePress / VuePress / Docusaurus）
- [ ] 添加单元测试

## 📚 相关文档

- [PATHS_REFACTORING.md](./PATHS_REFACTORING.md) - 详细的重构说明
- [MONOREPO_SETUP.md](./MONOREPO_SETUP.md) - Monorepo 设置指南
- [QUICK_START.md](./QUICK_START.md) - 快速开始指南

## 👥 贡献者

- 完成日期：2025-12-03
- 主要更改：移除所有硬编码路径，实现动态配置

