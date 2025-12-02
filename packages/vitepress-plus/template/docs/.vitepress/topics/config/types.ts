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
  slug: string // Unique identifier for routing
  items: TopicItem[]
}

export interface TopicsConfig {
  categories: TopicCategory[]
}

