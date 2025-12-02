import { vueTopic } from './vue'
import { reactTopic } from './react'
import type { TopicsData } from './types'

export const topicsData: TopicsData = {
  vue: vueTopic,
  react: reactTopic
}

export type { Article, Chapter, Topic, TopicsData } from './types'

