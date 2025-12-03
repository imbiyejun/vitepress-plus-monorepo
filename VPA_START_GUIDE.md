# VPA Start 使用指南

## 前置准备

### 1. 确保项目结构完整

VitePress Plus 项目需要以下目录结构：

```
vitepress-plus/
├── .vitepress/              # ✅ 已复制
│   ├── config.ts
│   ├── topics/
│   │   ├── config/
│   │   │   └── index.ts     # 专题分类配置
│   │   └── data/
│   │       ├── index.ts     # 导出 topicsData
│   │       ├── types.ts     # 类型定义
│   │       └── [topic-name]/
│   │           └── index.ts # 各专题数据
│   └── ...
├── articles/                # ✅ 文章目录
├── topics/                  # ✅ 专题模板
├── public/                  # ✅ 静态资源
│   └── images/
└── package.json
```

### 2. 确保 CLI 已构建

```bash
cd packages\vitepress-admin
pnpm run build:cli
```

## 使用方法

### 方法一：在 vitepress-plus 中使用 npm script

```bash
cd packages\vitepress-plus
pnpm run dev:admin
```

这会执行 `vpa start -r .`

### 方法二：直接使用 vpa 命令

```bash
cd packages\vitepress-plus
npx vpa start
```

### 方法三：指定项目根目录

```bash
# 从任意位置启动
npx vpa start -r D:\code\my-vitepress\vitepress-plus-monorepo\packages\vitepress-plus
```

### 方法四：自定义端口并自动打开浏览器

```bash
cd packages\vitepress-plus
npx vpa start -p 4000 -o
```

## 启动流程

当执行 `vpa start` 时，会发生以下步骤：

1. **解析参数**
   - `-r, --root`: 项目根目录（默认：当前目录）
   - `-p, --port`: 后端端口（默认：3000）
   - `-o, --open`: 是否自动打开浏览器

2. **设置环境变量**
   ```javascript
   {
     PORT: '3000',
     PROJECT_ROOT: '/path/to/vitepress-plus',
     NODE_ENV: 'development'
   }
   ```

3. **启动后端服务器**
   - 运行 `tsx server/index.ts`
   - 监听端口 3000
   - 读取 PROJECT_ROOT 目录中的数据

4. **启动前端开发服务器**
   - 运行 `vite --port 5173`
   - 前端访问地址：http://localhost:5173
   - API 代理到 http://localhost:3000

## 路径解析机制

### 项目根目录获取

```typescript
// 优先级顺序：
1. 环境变量 PROJECT_ROOT（CLI 传递）
2. process.cwd()（默认）
3. 特殊处理：如果当前目录名为 'admin' 或 'vitepress-admin'，返回父目录
```

### 关键路径

```typescript
// server/config/paths.ts
export function getProjectRoot(): string {
  // 1. 优先使用环境变量
  if (process.env.PROJECT_ROOT) {
    return process.env.PROJECT_ROOT
  }
  
  // 2. 检测是否在 admin 目录
  const currentDir = process.cwd()
  if (currentDir.endsWith('admin') || currentDir.endsWith('vitepress-admin')) {
    return path.resolve(currentDir, '..')
  }
  
  // 3. 默认使用当前目录
  return currentDir
}

// 派生路径
export function getPublicPath() {
  return path.join(getProjectRoot(), 'public')
}

export function getTopicsDataPath() {
  return path.join(getProjectRoot(), '.vitepress/topics/data')
}
```

## 数据加载验证

### 验证 topicsData 加载

启动后，后端会尝试加载：

```typescript
// server/utils/data-loader.ts
const dataPath = join(projectRoot, '.vitepress/topics/data/index.ts')
const module = await import(dataPath)
const topicsData = module.topicsData
```

### 成功标志

在终端中应该看到：

```
🚀 Starting VitePress Admin...

📁 Project root: D:\code\my-vitepress\vitepress-plus-monorepo\packages\vitepress-plus
🌐 Server port: 3000
-------------------

Project root: D:\code\my-vitepress\vitepress-plus-monorepo\packages\vitepress-plus
Serving static files from: D:\code\my-vitepress\vitepress-plus-monorepo\packages\vitepress-plus\public
[时间] 服务器运行在 http://localhost:3000
[时间] WebSocket服务器运行在 ws://localhost:3000
-------------------

VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## 常见问题

### 1. 找不到 topicsData

**错误**：`Failed to load topics data`

**解决**：
- 确保 `.vitepress/topics/data/index.ts` 存在
- 确保文件导出 `topicsData`
- 检查文件语法是否正确

### 2. 图片无法加载

**原因**：public 目录路径不正确

**解决**：
- 确保 `public/` 目录在项目根目录
- 检查终端输出的 "Serving static files from" 路径是否正确

### 3. API 请求 404

**原因**：后端服务未启动或端口冲突

**解决**：
- 检查端口 3000 是否被占用
- 使用 `-p` 参数指定其他端口
- 查看终端是否有错误信息

### 4. TypeScript 类型错误

**原因**：类型定义不兼容

**解决**：
- 已更新 `server/types/topic.ts` 以兼容两种格式
- 支持可选字段：`id`, `categoryId`, `summary` 等

## 目录权限检查

确保以下目录可读写：

```bash
# 检查目录权限
Test-Path "D:\code\my-vitepress\vitepress-plus-monorepo\packages\vitepress-plus\.vitepress"
Test-Path "D:\code\my-vitepress\vitepress-plus-monorepo\packages\vitepress-plus\public"
Test-Path "D:\code\my-vitepress\vitepress-plus-monorepo\packages\vitepress-plus\articles"
```

## 测试清单

启动后，在浏览器中测试以下功能：

- [ ] 访问 http://localhost:5173
- [ ] 查看专题列表
- [ ] 查看文章列表
- [ ] 上传图片
- [ ] 编辑文章
- [ ] 创建新专题
- [ ] WebSocket 实时更新

## 调试技巧

### 查看环境变量

在 `server/index.ts` 中添加：

```typescript
console.log('Environment:')
console.log('- PROJECT_ROOT:', process.env.PROJECT_ROOT)
console.log('- PORT:', process.env.PORT)
console.log('- NODE_ENV:', process.env.NODE_ENV)
```

### 查看加载的数据

在 `articleController.ts` 中添加：

```typescript
const topicsData = await loadTopicsData()
console.log('Loaded topics:', Object.keys(topicsData))
```

## 性能优化

### 1. 跳过缓存

数据加载器已添加时间戳参数，避免缓存问题：

```typescript
const module = await import(`${dataUrl}?t=${Date.now()}`)
```

### 2. 并发启动

前后端服务器并发启动，减少等待时间。

### 3. 热重载

- 前端：Vite HMR
- 后端：nodemon 监听文件变化

## 下一步

成功启动后：

1. 测试所有功能
2. 检查控制台是否有警告或错误
3. 验证文件路径解析是否正确
4. 测试图片上传和管理
5. 测试文章编辑和保存

## 相关文档

- [PATHS_REFACTORING.md](./PATHS_REFACTORING.md) - 路径重构说明
- [PATH_ALIAS_FIX.md](./packages/vitepress-admin/PATH_ALIAS_FIX.md) - 前端路径别名修复
- [QUICK_START.md](./QUICK_START.md) - 快速开始指南

