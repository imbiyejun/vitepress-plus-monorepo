import { Topic } from '../types'

export const reactTopic: Topic = {
  id: 'react',
  categoryId: 'frontend',
  name: 'React',
  slug: 'react',
  description: 'JavaScript library for building user interfaces',
  image: '/images/topics/react.png',
  chapters: [
    {
      id: '1',
      title: 'React Basics',
      description: 'Learn React core concepts including JSX, components, and props',
      articles: [
        {
          id: '1.1',
          title: 'React Introduction & JSX',
          slug: 'react-intro-jsx',
          summary: 'Understand React features and learn JSX syntax',
          status: 'completed'
        }
      ]
    }
  ]
}

