// Shared topic types for VitePress Plus projects
// Compatible with both old and new data formats

export interface Article {
  id?: string
  slug: string
  title: string
  summary?: string
  status: 'completed' | 'in-progress' | 'planned' | 'draft'
  description?: string
  chapterTitle?: string
  topicId?: string
}

export interface Chapter {
  id?: string
  title: string
  description?: string
  articles: Article[]
}

export interface Topic {
  id?: string
  slug: string
  name: string
  description: string
  image?: string
  categoryId?: string
  chapters: Chapter[]
}

export interface TopicsData {
  [key: string]: Topic
}

export interface TopicCategory {
  id?: string
  title: string
  slug?: string
  items: Array<{
    id?: string
    categoryId?: string
    slug: string
    name: string
    description?: string
    image?: string
  }>
}
