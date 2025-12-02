# @imbiyejun/vitepress-admin

本地开发管理工具，用于管理 VitePress Plus 项目的内容。

## 功能特性

✅ **已完成功能**

- [x] 配置加载和路径解析
- [x] 文件系统服务（读写专题、文章）
- [x] WebSocket 实时文件监听
- [x] 专题管理 API
- [x] 文章管理 API
- [x] 图片管理 API
- [x] 前端基础框架（Vue 3 + Ant Design Vue）
- [x] 路由和布局组件
- [x] 实时同步状态显示

🚧 **待完善功能**

- [ ] 富文本编辑器集成（Markdown）
- [ ] 图片上传（multipart/form-data）
- [ ] 拖拽排序
- [ ] 批量操作
- [ ] 搜索和过滤
- [ ] 备份和恢复

## 快速开始

### 1. 安装

```bash
pnpm add -D @imbiyejun/vitepress-admin
```

### 2. 配置

在项目根目录创建 `vpa.config.js`：

```javascript
export default {
  server: {
    port: 3000,
    host: 'localhost'
  },
  project: {
    root: './',
    docsDir: './docs',
    articlesDir: './docs/articles',
    topicsConfigDir: './docs/.vitepress/topics/config',
    topicsDataDir: './docs/.vitepress/topics/data',
    publicDir: './docs/public',
    imagesDir: './docs/public/images'
  },
  watch: {
    enabled: true,
    debounce: 300
  }
}
```

### 3. 启动服务器

```bash
npx vpa start
```

或者添加到 `package.json` 的 scripts：

```json
{
  "scripts": {
    "admin:dev": "vpa start",
    "admin:start": "vpa start --open"
  }
}
```

### 4. 访问管理界面

打开浏览器访问：http://localhost:3000

## CLI 命令

### `vpa start`

启动管理服务器

**选项：**

- `-p, --port <port>` - 指定端口号（默认：3000）
- `-c, --config <path>` - 指定配置文件路径
- `-o, --open` - 自动打开浏览器

**示例：**

```bash
# 在默认端口启动
vpa start

# 在指定端口启动
vpa start -p 4000

# 启动并打开浏览器
vpa start --open

# 使用自定义配置文件
vpa start -c ./custom-config.js
```

## API 接口

### 专题管理

- `GET /api/topics` - 获取专题列表
- `POST /api/topics` - 更新专题配置
- `GET /api/topics/data` - 获取专题数据
- `POST /api/topics/data` - 更新专题数据

### 文章管理

- `GET /api/articles/:topicSlug` - 获取专题下的所有文章
- `GET /api/articles/:topicSlug/:articleSlug` - 获取文章详情
- `POST /api/articles/:topicSlug/:articleSlug` - 保存文章
- `DELETE /api/articles/:topicSlug/:articleSlug` - 删除文章
- `PATCH /api/articles/:topicSlug/:articleSlug/rename` - 重命名文章

### 图片管理

- `GET /api/images/list` - 获取图片列表
- `POST /api/images/upload` - 上传图片
- `POST /api/images/directory` - 创建目录
- `DELETE /api/images/:filename` - 删除图片

## WebSocket 实时监听

服务器会监听以下目录的文件变化：

- `docs/.vitepress/topics/config` - 专题配置
- `docs/.vitepress/topics/data` - 专题数据
- `docs/articles` - 文章内容

当文件发生变化时，会通过 WebSocket 实时推送到前端。

## 开发模式

### 开发服务器

```bash
cd packages/vitepress-admin
pnpm dev
```

这将启动：
- 前端开发服务器（Vite）：http://localhost:5173
- 后端 API 服务器：http://localhost:3000

前端会自动代理 `/api` 请求到后端服务器。

### 构建

```bash
pnpm build
```

将会构建：
- `dist/client` - 前端静态资源
- `dist/server` - 后端服务器代码

## 项目结构

```
packages/vitepress-admin/
├── bin/
│   └── vpa.js              # CLI 入口
├── config/
│   ├── types.ts            # 配置类型定义
│   ├── default.config.ts   # 默认配置
│   └── loader.ts           # 配置加载器
├── server/
│   ├── index.ts            # 服务器入口
│   ├── controllers/        # API 控制器
│   ├── routes/             # 路由定义
│   ├── services/           # 业务服务
│   │   ├── fileSystem.ts   # 文件系统服务
│   │   └── watcher.ts      # 文件监听服务
│   └── utils/
│       └── pathResolver.ts # 路径解析器
├── src/
│   ├── main.ts             # 前端入口
│   ├── App.vue
│   ├── router/             # 路由配置
│   ├── layouts/            # 布局组件
│   ├── views/              # 页面组件
│   └── services/
│       └── websocket.ts    # WebSocket 客户端
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 技术栈

### 后端
- Express - HTTP 服务器
- WebSocket - 实时通信
- Chokidar - 文件监听
- Vite - 开发服务器

### 前端
- Vue 3 - UI 框架
- Ant Design Vue - 组件库
- Vue Router - 路由管理
- TypeScript - 类型支持

## 注意事项

1. **安全性**：默认情况下，服务器只监听 `localhost`，不对外开放
2. **路径权限**：所有文件操作都会进行路径白名单检查
3. **实时同步**：WebSocket 连接断开后会自动重连（最多 5 次）
4. **并发保护**：文件写入操作建议使用防抖/节流

## 许可证

MIT
