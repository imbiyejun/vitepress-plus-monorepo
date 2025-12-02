import type { VPAConfig } from './types'

export const defaultConfig: VPAConfig = {
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
  image: {
    localStorage: {
      enabled: true,
      path: './docs/public/images',
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    }
  },
  watch: {
    enabled: true,
    debounce: 300,
    ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**']
  }
}

