import { defineConfig } from 'vitepress'
import type { DefaultTheme } from 'vitepress'
import { topicsData } from './topics/data'
import type { Topic } from './topics/data/types'
import { topics } from './topics/config'

// 生成导航栏的专题分类
function generateTopicsNav(): DefaultTheme.NavItem[] {
  return topics
    .filter(category => category.items.length > 0)
    .map(category => ({
      text: category.title,
      items: category.items.map(topic => ({
        text: topic.name,
        link: `/topics/${topic.slug}.html`
      }))
    }))
}

// 获取状态标签
function getStatusTag(status: 'completed' | 'draft' | 'planned'): string {
  // 已完成的文章不显示状态
  if (status === 'completed') return ''

  const statusMap = {
    draft: '<span class="article-status draft">草稿</span>',
    planned: '<span class="article-status planned">计划</span>'
  }
  return statusMap[status] || ''
}

// 生成所有专题的侧边栏配置
function generateSidebars(): DefaultTheme.Sidebar {
  const sidebars: DefaultTheme.Sidebar = {}

  Object.entries(topicsData).forEach(([key, topic]) => {
    sidebars[`/articles/${key}/`] = generateSidebarFromTopic(topic)
  })

  return sidebars
}

// 根据专题数据生成侧边栏配置
function generateSidebarFromTopic(topic: Topic): DefaultTheme.SidebarItem[] {
  return [
    {
      text: topic.name,
      items: topic.chapters.map(chapter => ({
        text: chapter.title,
        collapsed: false,
        items: chapter.articles.map(article => ({
          text: `${article.title}${getStatusTag(article.status)}`,
          link: `/articles/${topic.slug}/${article.slug}`
        }))
      }))
    }
  ]
}

export default defineConfig({
  title: 'Mind Palace',
  description: '个人知识管理系统',
  lang: 'zh-CN',

  // 配置动态路由
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    // 添加自定义样式
    [
      'style',
      {},
      `
      .article-status {
        display: inline-block;
        font-size: 11px;
        line-height: 14px;
        padding: 0 4px;
        border-radius: 2px;
        font-weight: normal;
        margin-left: 6px;
        opacity: 0.9;
        vertical-align: middle;
        white-space: nowrap;
      }
      .article-status.draft {
        color: var(--vp-c-text-2);
        background: var(--vp-c-gray-light-4);
      }
      .article-status.planned {
        color: var(--vp-c-text-2);
        background: var(--vp-c-gray-light-4);
      }
      /* 暗色主题 */
      html[data-theme='dark'] .article-status.draft,
      html[data-theme='dark'] .article-status.planned {
        color: var(--vp-c-text-3);
        background: var(--vp-c-bg-soft-mute);
      }
      /* 悬停效果 */
      .article-status:hover {
        opacity: 1;
      }
    `
    ]
  ],

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: '首页', link: '/' },
      { text: '专题', link: '/topics' },
      ...generateTopicsNav(),
      { text: '关于', link: '/about' }
    ] as DefaultTheme.NavItem[],

    // 使用自动生成的侧边栏配置
    sidebar: generateSidebars(),

    socialLinks: [{ icon: 'github' as const, link: 'https://gitee.com/hrbust_cheny/mind-palace' }],

    search: {
      provider: 'local',
      options: {
        locales: {
          zh: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭'
                }
              }
            }
          }
        },
        include: [
          '/articles/**/*', // 搜索所有文章
          '/topics/**/*', // 搜索专题页面
          '/about.md' // 搜索关于页面
        ],
        _weight: {
          title: 2, // 标题权重
          description: 1.5, // 描述权重
          content: 1 // 内容权重
        }
      }
    },

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2025'
    }
  } as DefaultTheme.Config
})
