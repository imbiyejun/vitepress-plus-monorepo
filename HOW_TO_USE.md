# 📖 如何使用 VitePress Plus Monorepo

## ✅ 当前可用的功能

### 1. VitePress Plus 核心包
- ✅ 配置加载器
- ✅ 专题管理组件
- ✅ 文章状态标签
- ✅ 自定义主题
- ✅ 完整的模板

### 2. Admin 管理后台
- ✅ RESTful API 服务器
- ✅ 专题配置管理
- ✅ 文章CRUD操作
- ⏳ 前端界面（待开发）
- ⏳ WebSocket（待开发）

### 3. CLI 脚手架工具
- ✅ 创建新项目
- ✅ 初始化配置
- ✅ 项目信息显示

## 🎯 使用场景

### 场景 1: 使用示例项目

最简单的方式，立即查看效果：

```bash
cd vitepress-plus-monorepo
pnpm install
pnpm --filter @imbiyejun/vitepress-plus build
cd examples/docs
pnpm dev
```

访问: http://localhost:5173/

### 场景 2: 使用 CLI 创建新项目

```bash
# 1. 构建 CLI
cd vitepress-plus-monorepo
pnpm --filter @imbiyejun/vitepress-plus-cli build

# 2. 创建项目
./packages/vitepress-plus-cli/bin/vp-plus.js create my-docs --admin

# 3. 进入项目并安装依赖
cd my-docs
pnpm install

# 4. 启动
pnpm dev
```

### 场景 3: 使用 Admin API

```bash
# 1. 在项目中初始化配置
cd examples/docs
node ../../packages/vitepress-admin/bin/vpa.js init

# 2. 启动 Admin 服务器
node ../../packages/vitepress-admin/bin/vpa.js start

# 3. 测试 API
curl http://localhost:3000/api/topics
curl http://localhost:3000/api/articles/vue
```

## 📝 配置文件示例

### vitepress-plus.config.js

```javascript
export default {
  vitepressPlus: {
    paths: {
      docs: './docs',
      articles: './docs/articles',
      topics: './docs/.vitepress/topics'
    },
    topics: {
      enabled: true,
      autoGenerateNav: true
    }
  },
  vitepress: {
    title: 'My Docs',
    description: 'My documentation'
  }
}
```

### vpa.config.js

```javascript
export default {
  server: {
    port: 3000,
    host: 'localhost'
  },
  project: {
    root: './',
    docsDir: './docs',
    articlesDir: './docs/articles'
  }
}
```

## 🔍 API 端点

### 专题相关
- `GET /api/topics` - 获取专题列表
- `POST /api/topics` - 更新专题配置
- `GET /api/topics/data` - 获取专题数据
- `POST /api/topics/data` - 更新专题数据

### 文章相关
- `GET /api/articles/:topicSlug` - 获取文章列表
- `GET /api/articles/:topicSlug/:articleSlug` - 获取文章详情
- `POST /api/articles/:topicSlug/:articleSlug` - 保存文章
- `DELETE /api/articles/:topicSlug/:articleSlug` - 删除文章
- `PATCH /api/articles/:topicSlug/:articleSlug/rename` - 重命名文章

### 系统相关
- `GET /health` - 健康检查

## ⚙️ 开发工作流

### 开发核心包

```bash
# 终端 1: 监听核心包变化
cd packages/vitepress-plus
pnpm dev  # tsc --watch

# 终端 2: 运行示例项目
cd examples/docs
pnpm dev
```

### 开发 Admin

```bash
# 终端 1: 前端开发
cd packages/vitepress-admin
pnpm dev:client

# 终端 2: 后端开发
cd packages/vitepress-admin
pnpm dev:server

# 终端 3: VitePress 预览
cd examples/docs
pnpm dev
```

## 🎨 自定义配置

### 修改专题

编辑 `examples/docs/.vitepress/topics/config/index.ts`:

```typescript
export const topics: TopicCategory[] = [
  {
    title: '我的分类',
    id: 'my-category',
    slug: 'my-category',
    items: [
      {
        id: 'my-topic',
        categoryId: 'my-category',
        name: '我的专题',
        slug: 'my-topic',
        description: '专题描述',
        image: '/images/my-topic.png'
      }
    ]
  }
]
```

### 添加文章

1. 创建文件 `articles/my-topic/my-article.md`
2. 添加 Front Matter:
   ```yaml
   ---
   title: 我的文章
   date: 2025-12-02
   status: draft
   summary: 文章摘要
   ---
   ```
3. 编写内容
4. 文章会自动出现在导航和侧边栏

## 💻 开发命令速查

```bash
# Monorepo 根目录
pnpm install              # 安装所有依赖
pnpm build               # 构建所有包
pnpm dev                 # 开发核心包
pnpm dev:admin           # 开发 Admin
pnpm dev:example         # 开发示例

# 核心包
pnpm --filter @imbiyejun/vitepress-plus build
pnpm --filter @imbiyejun/vitepress-plus dev

# Admin
pnpm --filter @imbiyejun/vitepress-admin build
pnpm --filter @imbiyejun/vitepress-admin dev

# CLI
pnpm --filter @imbiyejun/vitepress-plus-cli build
```

## 🌟 特色功能

### 1. 零配置启动
使用默认配置，无需额外配置即可启动。

### 2. 类型安全
100% TypeScript，完整的类型提示。

### 3. 灵活配置
支持多种配置文件格式和环境变量。

### 4. 跨平台
Windows/Linux/macOS 完全兼容。

### 5. 现代化
ES Modules、pnpm workspace、最新技术栈。

## 🎓 学习资源

- [VitePress 官方文档](https://vitepress.dev/)
- [Ant Design Vue](https://antdv.com/)
- [Vue 3 文档](https://cn.vuejs.org/)

---

**快速开始**: ⚡ 10分钟  
**上手难度**: ⭐⭐ 简单  
**功能完整度**: ⭐⭐⭐⭐ 优秀

