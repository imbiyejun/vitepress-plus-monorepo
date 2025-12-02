import { defineConfig } from 'vitepress'
import type { DefaultTheme } from 'vitepress'
import { topicsData } from './topics/data'
import type { Topic } from './topics/data/types'
import { topics } from './topics/config'

// Generate topics navigation
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

// Get status tag
function getStatusTag(status: 'completed' | 'draft' | 'planned'): string {
  // Don't show status for completed articles
  if (status === 'completed') return ''

  const statusMap = {
    draft: '<span class="article-status draft">Draft</span>',
    planned: '<span class="article-status planned">Planned</span>'
  }
  return statusMap[status] || ''
}

// Generate all topics sidebars
function generateSidebars(): DefaultTheme.Sidebar {
  const sidebars: DefaultTheme.Sidebar = {}

  Object.entries(topicsData).forEach(([key, topic]) => {
    sidebars[`/articles/${key}/`] = generateSidebarFromTopic(topic)
  })

  return sidebars
}

// Generate sidebar from topic data
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
  title: 'VitePress Plus',
  description: 'Enhanced VitePress documentation system',
  lang: 'en-US',

  // Configure clean URLs
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    // Add custom styles
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
      /* Dark theme */
      html[data-theme='dark'] .article-status.draft,
      html[data-theme='dark'] .article-status.planned {
        color: var(--vp-c-text-3);
        background: var(--vp-c-bg-soft-mute);
      }
      /* Hover effect */
      .article-status:hover {
        opacity: 1;
      }
    `
    ]
  ],

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Topics', link: '/topics' },
      ...generateTopicsNav(),
      { text: 'About', link: '/about' }
    ] as DefaultTheme.NavItem[],

    // Use auto-generated sidebar config
    sidebar: generateSidebars(),

    socialLinks: [{ icon: 'github' as const, link: 'https://github.com' }],

    search: {
      provider: 'local'
    },

    footer: {
      message: 'Built with VitePress Plus',
      copyright: 'Copyright © 2025'
    }
  } as DefaultTheme.Config
})

