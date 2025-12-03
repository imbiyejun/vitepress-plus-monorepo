# 路径重构说明

## 背景

原先的代码中存在大量硬编码路径，包括：
- `@mind-palace/docs` - 硬编码的包名
- `docs/public` - 硬编码的目录结构
- `docs/.vitepress/topics/data` - 硬编码的数据路径

这些硬编码路径导致 `vitepress-admin` 无法作为独立的 npm 包在其他项目中使用。

## 解决方案

### 1. 创建统一的路径配置模块

**文件：`server/config/paths.ts`**

提供统一的路径获取函数：
- `getProjectRoot()` - 获取项目根目录
- `getPublicPath()` - 获取 public 目录
- `getArticlesPath()` - 获取 articles 目录
- `getTopicsPath()` - 获取 topics 目录
- `getVitePressPath()` - 获取 .vitepress 目录
- `getTopicsDataPath()` - 获取 topics 数据目录
- `getTopicsConfigPath()` - 获取 topics 配置目录

### 2. 创建类型定义

**文件：`server/types/topic.ts`**

定义了所有 Topic 相关的类型：
- `Article` - 文章类型
- `Chapter` - 章节类型
- `Topic` - 专题类型
- `TopicsData` - 专题数据集合
- `TopicCategory` - 专题分类

这样就不需要从目标项目导入类型了。

### 3. 创建数据加载工具

**文件：`server/utils/data-loader.ts`**

提供动态加载函数：
- `loadTopicsData()` - 动态加载目标项目的 topics 数据
- `getTopicsDataPath()` - 获取 topics 数据路径
- `getTopicsConfigPath()` - 获取 topics 配置路径
- `getTopicDataPath(slug)` - 获取特定专题的数据路径

使用动态 `import()` 和 `pathToFileURL()` 来加载目标项目的数据。

## 更改的文件

### ✅ 已更新的文件

1. **server/config/paths.ts**
   - 新增多个路径获取函数

2. **server/types/topic.ts**
   - 新文件，定义所有 Topic 相关类型

3. **server/utils/data-loader.ts**
   - 新文件，提供动态数据加载

4. **server/controllers/articleController.ts**
   - 移除 `@mind-palace/docs` 导入
   - 使用 `loadTopicsData()` 动态加载数据
   - 使用 `getArticlesPath()` 替代硬编码路径

5. **server/services/topic-sync.ts**
   - 移除 `../../../docs/.vitepress/topics/data/types` 导入
   - 使用本地类型定义
   - 使用路径配置函数替代所有硬编码路径

6. **server/controllers/topicController.ts**
   - 使用路径配置函数替代所有硬编码路径
   - 添加 `.js` 扩展名（ES 模块要求）

7. **server/controllers/categoryController.ts**
   - 使用路径配置函数替代所有硬编码路径
   - 添加 `.js` 扩展名

## 使用方式

### 在目标项目中使用

当 `vitepress-admin` 作为 npm 包安装到其他项目时：

```typescript
// 项目根目录会自动从以下来源获取：
// 1. 环境变量 PROJECT_ROOT（最高优先级）
// 2. CLI 参数 --root
// 3. process.cwd()（默认）
```

### 项目结构要求

目标 VitePress Plus 项目需要以下结构：

```
your-project/
├── .vitepress/
│   └── topics/
│       ├── config/
│       │   └── index.ts
│       └── data/
│           └── index.ts
├── articles/
├── topics/
├── public/
└── package.json
```

## 向后兼容性

✅ **完全兼容**：所有路径都是动态计算的，支持不同的项目结构。

⚠️ **注意**：
- 目标项目必须导出 `topicsData`（从 `.vitepress/topics/data/index.ts`）
- 类型定义应该与 `server/types/topic.ts` 中的定义兼容

## 测试清单

- [ ] 在 vitepress-plus 中运行 `vpa start`
- [ ] 验证文章列表加载
- [ ] 验证专题管理功能
- [ ] 验证图片上传功能
- [ ] 在新项目中测试（确保没有硬编码依赖）

## 好处

1. **可移植性**：可以在任何 VitePress Plus 项目中使用
2. **灵活性**：支持不同的目录结构
3. **可维护性**：所有路径在一个地方管理
4. **类型安全**：完整的 TypeScript 类型定义
5. **独立性**：不依赖特定的包名或项目结构

## 下一步

1. ✅ 移除所有硬编码路径
2. ✅ 创建统一的配置系统
3. ✅ 支持动态数据加载
4. ⏳ 测试在实际项目中的使用
5. ⏳ 完善错误处理和日志
6. ⏳ 添加配置文件支持（可选）

