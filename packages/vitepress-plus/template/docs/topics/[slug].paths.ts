import { topics } from '../.vitepress/topics/config'

export default {
  paths() {
    const allTopics = topics.flatMap(category => category.items)
    return allTopics.map(topic => ({
      params: { slug: topic.slug }
    }))
  }
}

