import { Topic } from '../types'

export const darkTopicsTopic: Topic = {
  id: 'dark-topics',
  categoryId: 'powerful-categories',
  name: '黑乎乎的专题',
  slug: 'dark-topics',
  description: '111',
  image: '',
  chapters: [
    {
      id: '1',
      title: '第一章',
      description: '124234',
      articles: [
        {
          id: '1.1',
          title: '测试文章',
          slug: 'test-article',
          summary: '大舒服点所发生的',
          status: 'planned'
        },
        {
          id: '1.2',
          title: '测试文章1',
          slug: 'test-article-1',
          summary: '发阿斯蒂芬',
          status: 'planned'
        },
        {
          id: '1.3',
          title: '我是-小火龙',
          slug: 'im-charmander',
          summary: '',
          status: 'planned'
        }
      ]
    }
  ]
}
