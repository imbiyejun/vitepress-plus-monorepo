import { Topic } from '../types'

export const vueTopic: Topic = {
  id: 'vue',
  categoryId: '前端技术',
  name: 'Vue.js',
  slug: 'vue',
  description: '渐进式JavaScript框架，用于构建用户界面1',
  image: 'http://cdn.qiniu.bnbiye.cn/img/202506252205259.png',
  chapters: [
    {
      id: '1',
      title: '入门基础',
      description: 'Vue.js的基础概念和使用方法',
      articles: [
        {
          id: '1.1',
          title: 'Vue.js 介绍与安装',
          slug: 'vue-intro-install',
          summary: '了解Vue.js框架并学习如何安装和使用它',
          status: 'completed'
        },
        {
          id: '1.2',
          title: '模板语法与数据绑定',
          slug: 'vue-template-databinding',
          summary: '学习Vue.js的模板语法和数据绑定机制',
          status: 'planned'
        },
        {
          id: '1.3',
          title: '计算属性与侦听器',
          slug: 'vue-computed-watch',
          summary: '深入理解Vue.js的计算属性和侦听器的使用',
          status: 'draft'
        }
      ]
    },
    {
      id: '2',
      title: '组件化开发',
      description: 'Vue.js的组件化开发方法',
      articles: [
        {
          id: '2.1',
          title: '组件基础',
          slug: 'vue-component-intro',
          summary: '了解Vue.js的组件基础概念和使用方法',
          status: 'completed'
        },
        {
          id: '2.2',
          title: '组件属性传递',
          slug: 'vue-component-props',
          summary: '学习Vue.js的组件属性传递机制',
          status: 'draft'
        }
      ]
    },
    {
      id: '3',
      title: '状态管理',
      description: 'Vue.js的状态管理方法',
      articles: [
        {
          id: '3.1',
          title: '状态管理基础',
          slug: 'vue-state-management',
          summary: '了解Vue.js的状态管理基础概念和使用方法',
          status: 'draft'
        }
      ]
    }
  ]
}
