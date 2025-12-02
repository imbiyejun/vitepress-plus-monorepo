// VitePress Plus configuration example
export default {
  vitepressPlus: {
    // Path configuration
    paths: {
      docs: '.',
      articles: './articles',
      topics: './.vitepress/topics',
      public: './public',
      images: './public/images'
    },

    // Topics feature configuration
    topics: {
      enabled: true,
      autoGenerateNav: true,
      autoGenerateSidebar: true,
      nav: {
        position: 'before',
        text: 'Topics',
        showListLink: true,
        grouped: true
      }
    },

    // Article status configuration
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
    }
  },

  // Native VitePress configuration
  vitepress: {
    title: 'VitePress Plus Example',
    description: 'Example documentation site using VitePress Plus'
  }
}

