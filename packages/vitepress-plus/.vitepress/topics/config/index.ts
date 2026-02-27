import { TopicCategory } from './types'

export const topics: TopicCategory[] = [
  {
    title: '前端技术',
    id: '前端技术',
    slug: 'frontend',
    items: [
      {
        id: 'vue',
        categoryId: '前端技术',
        name: 'Vue.js',
        slug: 'vue',
        description: '渐进式JavaScript框架，用于构建用户界面1',
        image: 'http://cdn.qiniu.bnbiye.cn/img/202506252205259.png'
      },
      {
        id: 'react',
        categoryId: '前端技术',
        name: 'React',
        slug: 'react',
        description: '用于构建用户界面的 JavaScript 库',
        image: '/images/topics/react.png'
      }
    ]
  }
]

export * from './types'
