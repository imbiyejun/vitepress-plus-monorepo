# ⚡ 快速开始指南

## 🚀 10分钟上手 VitePress Plus

### 步骤 1: 安装依赖（1分钟）

```bash
cd vitepress-plus-monorepo
pnpm install
```

### 步骤 2: 构建核心包（2分钟）

```bash
# 构建 vitepress-plus 核心包
pnpm --filter @imbiyejun/vitepress-plus build

# 构建 Admin 服务器（可选）
pnpm --filter @imbiyejun/vitepress-admin build:server

# 构建 CLI 工具（可选）
pnpm --filter @imbiyejun/vitepress-plus-cli build
```

### 步骤 3: 运行示例项目（3分钟）

```bash
cd examples/docs
pnpm dev
```

访问 http://localhost:5173/ 查看效果！

### 步骤 4: 启动 Admin 管理后台（可选，4分钟）

在新终端运行：

```bash
cd examples/docs

# 初始化配置
node ../../packages/vitepress-admin/bin/vpa.js init

# 启动服务器
node ../../packages/vitepress-admin/bin/vpa.js start
```

访问 http://localhost:3000/ 使用 Admin API！

## 📚 测试 API

### 健康检查

```bash
curl http://localhost:3000/health
```

### 获取专题列表

```bash
curl http://localhost:3000/api/topics
```

### 获取文章列表

```bash
curl http://localhost:3000/api/articles/vue
```

## 🔧 使用 CLI 创建新项目

```bash
# 构建 CLI（如果还没构建）
pnpm --filter @imbiyejun/vitepress-plus-cli build

# 创建新项目
cd ..
./vitepress-plus-monorepo/packages/vitepress-plus-cli/bin/vp-plus.js create my-docs --admin

# 进入项目
cd my-docs

# 安装依赖
pnpm install

# 启动
pnpm dev
```

## 📖 下一步

- 查看 [FINAL_SUMMARY.md](./FINAL_SUMMARY.md) 了解完整功能
- 查看 [ADMIN_PROGRESS.md](./ADMIN_PROGRESS.md) 了解 Admin API
- 查看 [PRIORITY_3_4_COMPLETE.md](./PRIORITY_3_4_COMPLETE.md) 了解详细实现

## 🎯 常用命令

### Monorepo 命令

```bash
# 安装所有依赖
pnpm install

# 构建所有包
pnpm build

# 格式化代码
pnpm format
```

### VitePress 命令

```bash
cd examples/docs

# 开发
pnpm dev

# 构建
pnpm build

# 预览
pnpm preview
```

### Admin 命令

```bash
# 启动服务器
vpa start

# 指定端口
vpa start --port 3001

# 初始化配置
vpa init

# 验证配置
vpa validate
```

### CLI 命令

```bash
# 创建项目
vp-plus create <name> [options]

# 初始化配置
vp-plus init

# 显示信息
vp-plus info
```

## 🐛 常见问题

### 1. VitePress 启动失败

**原因**: 核心包没有构建

**解决**:
```bash
pnpm --filter @imbiyejun/vitepress-plus build
```

### 2. Admin API 无法访问

**原因**: 服务器没有启动或端口被占用

**解决**:
```bash
# 检查端口
netstat -ano | findstr :3000

# 使用其他端口
vpa start --port 3001
```

### 3. 配置文件未找到

**原因**: 配置文件不在项目根目录

**解决**:
```bash
# 运行 init 命令创建配置
vpa init
```

## 💡 提示

1. **首次使用**: 建议先运行示例项目熟悉功能
2. **开发调试**: 使用 `pnpm dev` 而不是 `pnpm build`
3. **查看日志**: Admin 服务器会输出详细的日志信息
4. **配置文件**: 支持多种格式（.js, .ts, .mjs 等）
5. **环境变量**: 使用 .env 文件配置敏感信息

## 🎉 开始使用

现在你已经准备好使用 VitePress Plus 了！

访问文档了解更多功能和配置选项。

**祝你使用愉快！** 🚀

