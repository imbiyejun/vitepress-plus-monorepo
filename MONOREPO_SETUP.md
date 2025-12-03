# VitePress Plus Monorepo 开发指南

## 项目结构

```
vitepress-plus-monorepo/
├── packages/
│   ├── vitepress-admin/         # VitePress 管理后台（从 mind-palace/admin 迁移）
│   │   ├── bin/vpa.js          # CLI 入口
│   │   ├── cli/                # CLI 命令实现
│   │   ├── server/             # 后端服务
│   │   └── src/                # 前端代码
│   ├── vitepress-plus/         # VitePress Plus 文档（从 mind-palace/docs 迁移）
│   └── vitepress-plus-cli/     # VitePress Plus CLI 工具
└── examples/
    └── docs/                   # 示例项目
```

## 安装依赖

在项目根目录运行：

```bash
pnpm install
```

这将安装所有 workspace 包的依赖。

## 开发模式

### 方式一：在 vitepress-plus 中启动 admin

进入 vitepress-plus 目录：

```bash
cd packages\vitepress-plus
pnpm run dev:admin
```

这将启动 VitePress Admin，它会自动识别当前目录作为项目根目录。

### 方式二：使用全局 vpa 命令

首先在 vitepress-admin 目录构建 CLI：

```bash
cd packages\vitepress-admin
pnpm run build:cli
```

然后可以在任何 VitePress Plus 项目中使用：

```bash
# 在 vitepress-plus 目录中
cd packages\vitepress-plus
npx vpa start
```

### 方式三：直接开发 vitepress-admin

```bash
cd packages\vitepress-admin
pnpm run dev
```

这将同时启动前端开发服务器（端口 5173）和后端服务（端口 3000）。

## CLI 命令

### vpa start

启动 VitePress Admin 开发服务器。

**选项：**
- `-p, --port <port>` - 后端服务端口（默认：3000）
- `-o, --open` - 自动打开浏览器
- `-r, --root <root>` - 项目根目录（默认：当前目录）

**示例：**

```bash
# 基本用法
vpa start

# 指定端口并自动打开浏览器
vpa start -p 4000 -o

# 指定项目根目录
vpa start -r D:\my-vitepress-project
```

## 服务端口

- 前端开发服务器：http://localhost:5173
- 后端 API 服务：http://localhost:3000
- WebSocket 服务：ws://localhost:3000

## 目录结构要求

VitePress Admin 期望项目具有以下结构：

```
your-vitepress-plus-project/
├── public/                # 静态资源目录
│   └── images/           # 图片存储
├── articles/             # 文章目录
├── topics/               # 专题目录
└── package.json
```

注意：原 `mind-palace/docs/public` 结构已迁移为根目录的 `public/`。

## 环境变量

在 vitepress-admin 目录创建 `.env` 文件：

```env
# 本地存储路径（相对于项目根目录）
LOCAL_STORAGE_PATH=public/images

# 七牛云配置（可选）
QINIU_ACCESS_KEY=your_access_key
QINIU_SECRET_KEY=your_secret_key
QINIU_BUCKET=your_bucket
QINIU_DOMAIN=your_domain
QINIU_REGION=z0
```

## 构建

### 构建 vitepress-admin

```bash
cd packages\vitepress-admin
pnpm run build
```

这将构建：
- 前端代码（dist/）
- 后端代码（dist/）
- CLI 工具（dist/cli/）

### 构建所有包

在根目录：

```bash
pnpm run build
```

## 故障排查

### 1. 找不到 vpa 命令

确保已安装依赖：

```bash
cd packages\vitepress-admin
pnpm install
```

### 2. 无法访问图片

检查 `PROJECT_ROOT` 环境变量是否正确设置，以及 `public/` 目录是否存在。

### 3. TypeScript 类型错误

确保所有包都已安装依赖：

```bash
pnpm install
```

## 开发注意事项

1. **使用 ES 模块**：后端使用 ES 模块化开发，使用 `import` 而不是 `require`
2. **路径配置**：所有路径应通过 `server/config/paths.ts` 统一管理
3. **类型安全**：增加正确的 TypeScript 类型定义
4. **注释规范**：注释使用英文，只写关键部分
5. **前端组件**：使用 Ant Design Vue 组件库

