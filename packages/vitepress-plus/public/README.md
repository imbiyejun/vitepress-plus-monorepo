# Public 静态资源目录

这个目录用于存放VitePress项目的静态资源文件。

## 目录结构

```
docs/public/
├── images/           # 图片资源
│   ├── topics/       # 专题相关图片
│   ├── icons/        # 图标文件
│   └── logos/        # Logo图片
├── favicon.ico       # 网站图标
└── logo.png         # 网站Logo
```

## 使用方法

### 在Vue组件中使用
```vue
<template>
  <img src="/images/topics/vue-logo.png" alt="Vue.js" />
</template>
```

### 在Markdown文件中使用
```markdown
![Vue.js Logo](/images/topics/vue-logo.png)
```

### 在CSS中使用
```css
.bg-image {
  background-image: url('/images/topics/background.jpg');
}
```

## 注意事项

1. **路径规则**: 引用时使用 `/` 开头的绝对路径
2. **构建时处理**: 构建时这些文件会被复制到输出目录的根目录
3. **文件命名**: 建议使用小写字母和连字符，避免空格和特殊字符
4. **图片优化**: 建议压缩图片以提高加载速度

## 推荐的图片格式

- **Logo/图标**: PNG (支持透明背景)
- **照片**: JPG (文件较小)
- **简单图形**: SVG (矢量图，可缩放)
- **现代浏览器**: WebP (更好的压缩率) 