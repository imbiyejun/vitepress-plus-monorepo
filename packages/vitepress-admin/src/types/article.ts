export interface Article {
  id: string
  title: string
  slug: string
  summary?: string
  status: 'draft' | 'completed' | 'planned'
  chapterTitle?: string
  topicId?: string
  topicTitle?: string
  categoryId?: string
  path?: string
}

export interface ArticleWithTopic extends Article {
  topicTitle: string
  topicSlug: string
  categoryName: string
}
