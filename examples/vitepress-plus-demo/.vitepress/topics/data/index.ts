import { vueTopic } from './vue'
import { reactTopic } from './react'
import type { TopicsData } from './types'
import { aabbTopic } from './aabb'
import { ccTopic } from './cc'
import { jjTopic } from './jj'
import { hhhTopic } from './hhh'
import { criminalLawTopic } from './criminal-law'
import { ddDdTopic } from './dd-dd'
import { darkTopicsTopic } from './dark-topics'

export const topicsData: TopicsData = {
  vue: vueTopic,
  react: reactTopic,
  aabb: aabbTopic,
  cc: ccTopic,
  jj: jjTopic,
  hhh: hhhTopic,
  'dd-dd': ddDdTopic,
  'criminal-law': criminalLawTopic,
  'dark-topics': darkTopicsTopic
}

export type { Article, Chapter, Topic, TopicsData } from './types'
