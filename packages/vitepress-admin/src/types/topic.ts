export interface Topic {
  id: string
  title: string
  description: string
  path?: string
  icon?: string
  image?: string
  slug?: string
  articleCount?: number
  categoryId: string
}

export interface Category {
  id: string
  name: string
  slug: string
  topics: Topic[]
}
