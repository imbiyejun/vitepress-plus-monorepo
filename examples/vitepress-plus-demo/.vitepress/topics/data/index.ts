import { vueTopic } from './vue'
import { reactTopic } from './react'
import type { TopicsData } from './types'
import { businessTopic } from './business'
import { aabbTopic } from './aabb'
import { ccTopic } from './cc'
import { ddTopic } from './dd'
import { eeTopic } from './ee'
import { iiTopic } from './ii'
import { ggTopic } from './gg'
import { hhTopic } from './hh'
import { jjTopic } from './jj'
import { hhhTopic } from './hhh'

export const topicsData: TopicsData = {
  vue: vueTopic,
  react: reactTopic,
  business: businessTopic,
  aabb: aabbTopic,
  cc: ccTopic,
  dd: ddTopic,
  ee: eeTopic,
  ii: iiTopic,
  gg: ggTopic,
  hh: hhTopic,
  jj: jjTopic,
  hhh: hhhTopic
}

export type { Article, Chapter, Topic, TopicsData } from './types'
