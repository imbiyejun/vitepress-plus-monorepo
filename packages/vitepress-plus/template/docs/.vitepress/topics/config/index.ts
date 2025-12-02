import { TopicCategory } from './types'

export const topics: TopicCategory[] = [
  {
    title: 'Frontend',
    id: 'frontend',
    slug: 'frontend',
    items: [
      {
        id: 'vue',
        categoryId: 'frontend',
        name: 'Vue.js',
        slug: 'vue',
        description: 'Progressive JavaScript framework for building user interfaces',
        image: '/images/topics/vue.png'
      },
      {
        id: 'react',
        categoryId: 'frontend',
        name: 'React',
        slug: 'react',
        description: 'JavaScript library for building user interfaces',
        image: '/images/topics/react.png'
      }
    ]
  }
]

export * from './types'

