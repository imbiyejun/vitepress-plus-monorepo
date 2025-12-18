export interface TopicItem {
  id: string
  categoryId: string
  name: string
  slug: string
  description: string
  image: string
}

export interface TopicCategory {
  id: string
  title: string
  slug: string // 用于路由的唯一标识
  items: TopicItem[]
}

export interface TopicsConfig {
  categories: TopicCategory[]
}
