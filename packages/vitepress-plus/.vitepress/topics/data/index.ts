import { vueTopic } from './vue'
import { reactTopic } from './react'
import type { TopicsData } from './types'
import { aabbTopic } from './aabb'
import { ccTopic } from './cc'
import { jjTopic } from './jj'
import { hhhTopic } from './hhh'

export const topicsData: TopicsData = {
  vue: vueTopic,
  react: reactTopic,
  aabb: aabbTopic,
  cc: ccTopic,
  jj: jjTopic,
  hhh: hhhTopic
}

export type { Article, Chapter, Topic, TopicsData } from './types'
