# VitePress Plus Monorepo 快速开始

## 1. 安装依赖

在项目根目录运行：

```bash
pnpm install
```

## 2. 开发 vitepress-admin

### 方法一：独立开发（推荐用于调试）

```bash
cd packages\vitepress-admin
pnpm run dev
```

这将启动：
- 前端开发服务器：http://localhost:5173
- 后端 API 服务：http://localhost:3000

### 方法二：从 vitepress-plus 中调用

1. 首先构建 CLI：

```bash
cd packages\vitepress-admin
pnpm run build:cli
```

2. 然后在 vitepress-plus 中运行：

```bash
cd ..\vitepress-plus
pnpm run dev:admin
```

或者直接使用 vpa 命令：

```bash
npx vpa start
```

## 3. 使用 vpa 命令

在任何 VitePress Plus 项目中：

```bash
# 基本用法（使用当前目录作为项目根）
npx vpa start

# 指定端口
npx vpa start -p 4000

# 自动打开浏览器
npx vpa start -o

# 指定项目根目录
npx vpa start -r D:\my-docs-project
```

## 当前状态

✅ **已完成：**
- Monorepo 结构设置
- workspace 依赖配置
- vpa CLI 命令实现
- 路径配置统一管理（`server/config/paths.ts`）
- 前端与后端分离
- 依赖安装

⚠️ **注意事项：**
- 服务器代码使用 `tsx` 运行，不需要预编译
- 图片路径已从 `docs/public` 更新为 `public/`
- TypeScript 编译可能有一些类型错误，但不影响运行

## 项目结构说明

```
vitepress-plus-monorepo/
├── packages/
│   ├── vitepress-admin/
│   │   ├── bin/vpa.js           # CLI 入口（指向 dist/cli/）
│   │   ├── cli/                 # CLI 源代码
│   │   │   ├── index.ts
│   │   │   └── commands/
│   │   │       └── start.ts     # start 命令实现
│   │   ├── dist/cli/            # CLI 编译输出
│   │   ├── server/              # 后端服务（使用 tsx 运行）
│   │   │   ├── config/
│   │   │   │   └── paths.ts     # 路径配置
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   └── index.ts         # 服务器入口
│   │   └── src/                 # 前端 Vue 应用
│   ├── vitepress-plus/          # 文档项目
│   │   ├── public/              # 静态资源（原 docs/public）
│   │   ├── articles/            # 文章
│   │   └── topics/              # 专题
│   └── vitepress-plus-cli/
└── examples/
    └── docs/
```

## 常见问题

### Q: 找不到 vpa 命令？
A: 确保已经运行 `pnpm run build:cli`，或者使用 `npx vpa` 而不是直接调用 `vpa`。

### Q: 无法访问图片？
A: 检查 `vitepress-plus/public/` 目录是否存在，确保图片在该目录下。

### Q: 端口被占用？
A: 使用 `-p` 参数指定其他端口：`npx vpa start -p 4000`

### Q: TypeScript 编译错误？
A: 开发模式使用 tsx 运行，不需要编译。如果要构建生产版本，需要修复所有类型错误。

## 下一步

如果需要发布到 npm：

1. 修复所有 TypeScript 编译错误
2. 在所有 import 语句中添加 `.js` 扩展名
3. 运行 `pnpm run build` 确保构建成功
4. 配置 package.json 发布选项

