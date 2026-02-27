import { Topic } from '../types'

export const reactTopic: Topic = {
  id: 'react',
  categoryId: '前端技术',
  name: 'React',
  slug: 'react',
  description: '用于构建用户界面的 JavaScript 库',
  image: '/images/topics/react.png',
  chapters: [
    {
      id: '1',
      title: 'React 基础',
      description: '学习 React 的核心概念，包括 JSX、组件和 Props 等基础知识',
      articles: [
        {
          id: '1.1',
          title: 'React 简介与 JSX',
          slug: 'react-intro-jsx',
          summary: '了解 React 的特点和优势，学习 JSX 语法',
          status: 'completed'
        }
      ]
    }
  ]
}
