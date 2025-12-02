// Default configuration for VitePress Plus
import type { VitePlusPlusConfig } from './types.js'

export const defaultConfig: VitePlusPlusConfig = {
  paths: {
    docs: './docs',
    articles: './docs/articles',
    topics: './docs/.vitepress/topics',
    public: './docs/public',
    images: './docs/public/images'
  },
  topics: {
    enabled: true,
    dataPath: 'config/index.ts',
    typesPath: 'config/types.ts',
    autoGenerateNav: true,
    autoGenerateSidebar: true,
    nav: {
      position: 'before',
      text: 'Topics',
      showListLink: true,
      grouped: true
    },
    sidebar: {
      collapsible: true,
      collapsed: false
    }
  },
  articleStatus: {
    enabled: true,
    showInSidebar: true,
    showInPage: false,
    statusTypes: {
      completed: {
        label: 'Completed',
        show: false,
        color: '#52c41a'
      },
      draft: {
        label: 'Draft',
        show: true,
        color: '#faad14'
      },
      planned: {
        label: 'Planned',
        show: true,
        color: '#1890ff'
      }
    }
  },
  components: {
    enabled: true,
    list: ['TopicDetail', 'TopicsDisplay', 'ArticleStatusTag']
  },
  theme: {
    useDefaultExtension: true
  }
}

