import { Topic } from '../types'

export const vueTopic: Topic = {
  id: 'vue',
  categoryId: 'frontend',
  name: 'Vue.js',
  slug: 'vue',
  description: 'Progressive JavaScript framework for building user interfaces',
  image: '/images/topics/vue.png',
  chapters: [
    {
      id: '1',
      title: 'Getting Started',
      description: 'Basic concepts and usage of Vue.js',
      articles: [
        {
          id: '1.1',
          title: 'Introduction to Vue.js',
          slug: 'vue-intro-install',
          summary: 'Learn about Vue.js framework and how to install it',
          status: 'completed'
        },
        {
          id: '1.2',
          title: 'Template Syntax',
          slug: 'vue-template-databinding',
          summary: 'Learn Vue.js template syntax and data binding',
          status: 'draft'
        }
      ]
    }
  ]
}

