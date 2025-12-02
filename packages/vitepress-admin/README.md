# @imbiyejun/vitepress-admin

Local development tool for managing VitePress Plus project content.

## ✨ Features

- 📝 **Topic Management** - CRUD operations for topics and categories
- 📄 **Article Management** - CRUD operations with drag-and-drop sorting
- 🖼️ **Image Management** - Local storage + optional cloud storage (Qiniu)
- 🔄 **Real-time Sync** - File watching with WebSocket notifications
- 📁 **Directory Operations** - Manage project file structure
- ✏️ **Markdown Editor** - Built-in editor for articles

## 📦 Installation

```bash
npm install @imbiyejun/vitepress-admin --save-dev
# or
pnpm add @imbiyejun/vitepress-admin -D
```

## 🚀 Quick Start

### 1. Initialize Config

```bash
vpa init
```

This will create `vpa.config.js` and `.env.example` files.

### 2. Start Admin Server

```bash
vpa start
# or with options
vpa start --port 3000 --open
```

### 3. Access Admin UI

Open http://localhost:3000 in your browser.

## 📖 Configuration

See [Configuration Guide](../../docs/配置文件详细说明.md) for detailed configuration options.

## 📄 License

MIT

