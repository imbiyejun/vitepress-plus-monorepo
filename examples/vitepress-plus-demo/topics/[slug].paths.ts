import { topics } from '../.vitepress/topics/config'

// 获取所有专题的 slug 并生成路由参数
export default {
  paths: topics
    .flatMap(category => category.items)
    .map(topic => ({
      params: {
        slug: topic.slug
      }
    }))
}
