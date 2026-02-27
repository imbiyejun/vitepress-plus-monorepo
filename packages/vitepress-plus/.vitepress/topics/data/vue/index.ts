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
        }
      ]
    }
  ]
}
