export interface Article {
  id: string
  slug: string
  title: string
  summary: string
  status: 'completed' | 'draft' | 'planned'
  chapterTitle?: string
  topicId?: string
}

export interface Chapter {
  id: string
  title: string
  description: string
  articles: Article[]
}

export interface Topic {
  id: string
  categoryId: string
  name: string
  slug: string
  description: string
  image: string
  chapters: Chapter[]
}

export interface TopicsData {
  [key: string]: Topic
}
