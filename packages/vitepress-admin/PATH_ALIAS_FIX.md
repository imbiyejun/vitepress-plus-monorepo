# 路径别名修复

## 问题描述

前端代码中使用 `@/` 别名引入模块，但 Vite 和 TypeScript 没有正确配置路径别名，导致构建失败：

```
Error: The following dependencies are imported but could not be resolved:
  @/services/images
  @/services/api
  @/hooks/useTopics
  @/components/article/SimpleCategoryList.vue
  ...
```

## 解决方案

### 1. 修复 `vite.config.ts`

添加路径别名配置：

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')  // ✅ 添加别名配置
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

**关键点：**
- 使用 ES 模块方式获取 `__dirname`
- `@` 别名指向 `./src` 目录

### 2. 修复 `tsconfig.json`

添加 TypeScript 路径映射：

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "preserve",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "baseUrl": ".",           // ✅ 添加基础路径
    "paths": {                // ✅ 添加路径映射
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "server"]
}
```

**关键点：**
- `baseUrl` 设置为当前目录
- `paths` 配置 `@/*` 映射到 `src/*`

## 使用示例

现在所有 `@/` 开头的导入都能正确解析：

```typescript
// ✅ 组件导入
import ArticleList from '@/components/article/ArticleList.vue'
import SimpleCategoryList from '@/components/article/SimpleCategoryList.vue'

// ✅ 服务导入
import { getTopics } from '@/services/api'
import { uploadImage } from '@/services/images'

// ✅ Hooks 导入
import { useTopics } from '@/hooks/useTopics'
import { useArticles } from '@/hooks/useArticles'

// ✅ 工具导入
import eventBus from '@/utils/eventBus'
import { sortByOrder } from '@/utils/sort'

// ✅ 配置导入
import config from '@/config'
```

## 目录结构

```
vitepress-admin/
├── src/
│   ├── components/
│   │   ├── article/
│   │   ├── category/
│   │   ├── common/
│   │   ├── image/
│   │   ├── layout/
│   │   └── topic/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   ├── views/
│   ├── types/
│   ├── workers/
│   ├── router/
│   ├── config.ts
│   ├── main.ts
│   └── App.vue
├── vite.config.ts
└── tsconfig.json
```

## 测试

修复后，重新启动开发服务器：

```bash
cd packages/vitepress-admin
pnpm run dev
```

应该看到：
```
✓ Vite dev server running at http://localhost:5173
✓ All imports resolved successfully
```

## 相关文件

- ✅ `vite.config.ts` - Vite 路径别名配置
- ✅ `tsconfig.json` - TypeScript 路径映射
- ✅ 所有 `src/` 下的文件都可以使用 `@/` 导入

## 注意事项

1. **ES 模块**：使用 `fileURLToPath(import.meta.url)` 获取当前文件路径
2. **路径分隔符**：使用 `path.resolve()` 确保跨平台兼容
3. **TypeScript**：`paths` 配置用于类型检查，`baseUrl` 必须设置
4. **Vite**：`resolve.alias` 用于实际的模块解析

## 相关文档

- [Vite 路径别名配置](https://vitejs.dev/config/shared-options.html#resolve-alias)
- [TypeScript 路径映射](https://www.typescriptlang.org/tsconfig#paths)

