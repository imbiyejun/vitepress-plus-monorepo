# VitePress Plus Monorepo

VitePress Plus 增强版文档系统的 monorepo 项目。

## 📦 项目结构

```
vitepress-plus-monorepo/
├── packages/
│   ├── vitepress-admin/         # 管理后台（从 mind-palace/admin 迁移）
│   ├── vitepress-plus/          # 文档系统（从 mind-palace/docs 迁移）
│   └── vitepress-plus-cli/      # CLI 工具
├── examples/
│   └── docs/                    # 示例项目
└── README.md
```

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发服务器

#### 方法一：独立开发 vitepress-admin

```bash
cd packages\vitepress-admin
pnpm run dev
```

访问 http://localhost:5173 查看管理界面。

#### 方法二：在 vitepress-plus 中使用 admin

首先构建 CLI：

```bash
cd packages\vitepress-admin
pnpm run build:cli
```

然后在 vitepress-plus 中运行：

```bash
cd ..\vitepress-plus
pnpm run dev:admin
```

或者直接使用 vpa 命令：

```bash
npx vpa start
```

## 📖 文档

- [QUICK_START.md](./QUICK_START.md) - 快速开始指南
- [MONOREPO_SETUP.md](./MONOREPO_SETUP.md) - 详细的 monorepo 设置说明
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - 实施总结和技术细节

## 🛠️ VPA CLI 命令

`vpa` 是 VitePress Admin 的命令行工具。

### 安装

在任何 VitePress Plus 项目中，通过 workspace 依赖自动可用：

```bash
npx vpa --help
```

### 使用

```bash
# 启动开发服务器
vpa start

# 指定端口
vpa start -p 4000

# 自动打开浏览器
vpa start -o

# 指定项目根目录
vpa start -r D:\my-vitepress-project

# 查看帮助
vpa --help
vpa start --help
```

## 🔧 配置

### 环境变量

在 `packages/vitepress-admin/` 目录创建 `.env` 文件：

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

### 项目结构要求

VitePress Plus 项目需要以下结构：

```
your-project/
├── public/              # 静态资源（图片等）
├── articles/            # 文章目录
├── topics/              # 专题目录
└── package.json
```

**注意：** 原 `docs/public` 结构已迁移为根目录的 `public/`。

## 📦 Packages

### @imbiyejun/vitepress-admin

VitePress 文档系统的管理后台，提供：
- 📝 文章管理
- 🗂️ 分类管理
- 🏷️ 专题管理
- 🖼️ 图片管理（本地/七牛云）
- 🔄 实时预览

### @imbiyejun/vitepress-plus

增强版的 VitePress 文档系统，包含：
- 📚 专题系统
- 🎨 自定义主题
- 🔍 高级搜索
- 📊 数据管理

### @imbiyejun/vitepress-plus-cli

命令行工具，用于：
- 🚀 创建新项目
- ⚙️ 初始化配置
- 🛠️ 项目管理

## 🔨 开发

### 构建所有包

```bash
pnpm run build
```

### 构建单个包

```bash
# 构建 CLI
cd packages\vitepress-admin
pnpm run build:cli

# 构建客户端
pnpm run build:client

# 构建服务器
pnpm run build:server
```

### 代码规范

- 使用 ES 模块化（`import/export`）
- TypeScript 类型完整
- 注释使用英文，只写关键部分
- 前端使用 Ant Design Vue 组件

## 🐛 故障排查

### 找不到 vpa 命令

确保已构建 CLI：

```bash
cd packages\vitepress-admin
pnpm run build:cli
```

或使用 `npx vpa` 而不是直接调用 `vpa`。

### 无法访问图片

检查项目根目录是否有 `public/` 目录，确保图片在该目录下。

### 端口被占用

使用 `-p` 参数指定其他端口：

```bash
npx vpa start -p 4000
```

### TypeScript 编译错误

开发模式使用 `tsx` 运行服务器代码，不需要编译。如果要构建生产版本，需要修复类型错误。

## 📝 待办事项

- [ ] 修复 TypeScript 编译错误
- [ ] 完善单元测试
- [ ] 添加 E2E 测试
- [ ] 优化构建性能
- [ ] 完善文档和示例

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT

## 🔗 相关链接

- [VitePress 官网](https://vitepress.dev/)
- [pnpm 文档](https://pnpm.io/)
- [TypeScript 文档](https://www.typescriptlang.org/)

