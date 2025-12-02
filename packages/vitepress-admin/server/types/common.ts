// Common types for VitePress Admin server

export interface TopicCategory {
  id: string
  title: string
  slug: string
  items: TopicItem[]
}

export interface TopicItem {
  id: string
  categoryId: string
  name: string
  slug: string
  description: string
  image: string
}

export interface Article {
  id: string
  slug: string
  title: string
  summary: string
  status: 'completed' | 'draft' | 'planned'
  chapterTitle?: string
  topicId?: string
  date?: string
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

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

