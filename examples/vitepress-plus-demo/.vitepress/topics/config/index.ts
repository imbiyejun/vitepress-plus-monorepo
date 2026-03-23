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
        description: '渐进式JavaScript框架，用于构建用户界面',
        image: 'http://cdn.qiniu.bnbiye.cn/img/202506252205259.png'
      },
      {
        id: 'react',
        categoryId: '前端技术',
        name: 'React',
        slug: 'react',
        description: '用于构建用户界面的 JavaScript 库',
        image: '/images/topics/react.png'
      },
      {
        id: 'hhh',
        categoryId: '前端技术',
        name: 'hhheqwr',
        slug: 'hhh',
        description: 'hhh',
        image: 'http://cdn.qiniu.bnbiye.cn/pp.1.6a99306-2025-11-19-152413793-.jpg'
      }
    ]
  },
  {
    title: 'hhh',
    id: 'hhh',
    slug: 'hhh',
    items: [
      {
        id: 'aabb',
        categoryId: 'hhh',
        name: 'aabb',
        slug: 'aabb',
        description: 'aabbasdfdf',
        image: ''
      },
      {
        id: 'jj',
        categoryId: 'hhh',
        name: 'jj',
        slug: 'jj',
        description: 'jj',
        image: ''
      },
      {
        id: 'cc',
        categoryId: 'hhh',
        name: 'cc',
        slug: 'cc',
        description: 'cc333',
        image: ''
      },
      {
        id: 'dd-dd',
        categoryId: 'hhh',
        name: 'dd-dd',
        slug: 'dd-dd',
        description: 'dd-dd',
        image: ''
      }
    ]
  },
  {
    title: '法律相关',
    id: 'law',
    slug: 'law',
    items: [
      {
        id: 'criminal-law',
        categoryId: 'law',
        name: '刑法',
        slug: 'criminal-law',
        description: '111',
        image: ''
      }
    ]
  },
  {
    title: '一个厉害的大类',
    id: 'powerful-categories',
    slug: 'powerful-categories',
    items: [
      {
        id: 'dark-topics',
        categoryId: 'powerful-categories',
        name: '黑乎乎的专题',
        slug: 'dark-topics',
        description: '111',
        image: ''
      }
    ]
  }
]

export * from './types'
