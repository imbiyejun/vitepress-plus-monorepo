// Shared topic types for VitePress Plus projects

export interface Article {
  slug: string
  title: string
  status: 'completed' | 'in-progress' | 'planned'
  description?: string
  id?: string
}

export interface Chapter {
  title: string
  description?: string
  articles: Article[]
  id?: string
}

export interface Topic {
  slug: string
  name: string
  description: string
  image?: string
  chapters: Chapter[]
  id?: string
}

export interface TopicsData {
  [key: string]: Topic
}

export interface TopicCategory {
  title: string
  items: Array<{
    slug: string
    name: string
    description: string
    image?: string
  }>
}

