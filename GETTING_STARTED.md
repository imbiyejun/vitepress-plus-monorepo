# VitePress Plus Monorepo - 快速入门

## 🚀 开始使用

### 1. 安装依赖

在 monorepo 根目录运行：

```bash
cd vitepress-plus-monorepo
pnpm install
```

这会安装所有包的依赖，并建立 workspace 链接。

### 2. 构建核心包

```bash
# 构建 vitepress-plus 核心包
pnpm --filter @imbiyejun/vitepress-plus build

# 或者开发模式（自动监听变化）
pnpm --filter @imbiyejun/vitepress-plus dev
```

### 3. 运行示例项目

```bash
# 进入示例目录
cd examples/docs

# 安装依赖（如果需要）
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:5173 查看效果。

## 📦 包结构说明

### @imbiyejun/vitepress-plus
**核心增强包** - 提供 VitePress 的扩展功能

- 📍 位置: `packages/vitepress-plus/`
- 🎯 用途: 生产依赖，提供主题、组件、配置等
- 🔧 开发: `pnpm dev` 或 `pnpm build`

### @imbiyejun/vitepress-admin
**管理后台** - 本地开发工具（开发中）

- 📍 位置: `packages/vitepress-admin/`
- 🎯 用途: 开发依赖，提供可视化管理界面
- 🔧 开发: `pnpm dev` 或 `pnpm build`
- ⚠️ 当前状态: 基础结构已搭建，功能待实现

### @imbiyejun/vitepress-plus-cli
**脚手架工具** - 项目初始化工具（开发中）

- 📍 位置: `packages/vitepress-plus-cli/`
- 🎯 用途: 全局安装，快速创建项目
- 🔧 开发: `pnpm build`
- ⚠️ 当前状态: 基础结构已搭建，功能待实现

## 🛠️ 开发工作流

### 场景 1: 修改核心包模板

```bash
# 1. 修改 packages/vitepress-plus/template/ 中的文件

# 2. 在示例项目中测试
cd examples/docs
pnpm dev

# 3. 查看效果
```

### 场景 2: 开发新功能

```bash
# 1. 在对应的包目录开发
cd packages/vitepress-plus
# 编辑 src/ 中的代码

# 2. 构建
pnpm build

# 3. 在示例项目测试
cd ../../examples/docs
pnpm dev
```

### 场景 3: 同时开发多个包

在根目录使用多个终端：

```bash
# 终端 1: 监听核心包变化
pnpm dev

# 终端 2: 运行示例项目
cd examples/docs && pnpm dev

# 终端 3: 开发 admin（如果需要）
pnpm dev:admin
```

## 📋 常用命令

### 根目录命令

```bash
# 安装所有依赖
pnpm install

# 构建所有包
pnpm build

# 格式化代码
pnpm format

# 检查代码格式
pnpm format:check

# 运行所有测试
pnpm test
```

### 包级别命令

```bash
# 在特定包中运行命令
pnpm --filter @imbiyejun/vitepress-plus <command>
pnpm --filter @imbiyejun/vitepress-admin <command>
pnpm --filter example-docs <command>

# 示例:
pnpm --filter @imbiyejun/vitepress-plus build
pnpm --filter example-docs dev
```

## 🎨 自定义示例项目

示例项目位于 `examples/docs/`，你可以：

1. **修改内容**
   - 编辑 `index.md`、`about.md` 等页面
   - 在 `articles/` 中添加新文章

2. **修改配置**
   - 编辑 `.vitepress/config.ts`
   - 修改 `.vitepress/topics/config/index.ts` 添加新专题

3. **自定义主题**
   - 修改 `.vitepress/theme/index.ts`
   - 引用自定义组件和样式

## 🔍 项目文件说明

### 核心配置文件

```
vitepress-plus-monorepo/
├── package.json              # 根 package.json，定义 workspace 脚本
├── pnpm-workspace.yaml       # pnpm workspace 配置
├── tsconfig.json             # 共享 TypeScript 配置
├── .prettierrc               # 代码格式化配置
└── .gitignore                # Git 忽略规则
```

### 包配置文件

每个包都有自己的：
- `package.json` - 包信息和依赖
- `tsconfig.json` - TypeScript 配置（继承根配置）
- `README.md` - 包文档

## ⚠️ 注意事项

1. **首次安装**
   - 必须在根目录运行 `pnpm install`
   - 不要在各个包目录单独安装依赖

2. **依赖引用**
   - 包之间使用 `workspace:*` 引用
   - 发布时会自动替换为实际版本号

3. **路径引用**
   - 示例项目通过相对路径引用 template 文件
   - 如果移动文件，需要更新引用路径

4. **构建顺序**
   - 核心包需要先构建
   - 其他包才能正确引用

## 📚 下一步

- 查看 [MIGRATION_PROGRESS.md](./MIGRATION_PROGRESS.md) 了解项目进度
- 查看各个包的 README 了解详细用法
- 参考 `examples/docs` 学习如何使用
- 开始开发待实现的功能！

## 🤝 需要帮助？

如有问题，请：
1. 检查 [MIGRATION_PROGRESS.md](./MIGRATION_PROGRESS.md) 中的已知问题
2. 查看各包的 README 文档
3. 提交 Issue

---

**Happy Coding! 🎉**

