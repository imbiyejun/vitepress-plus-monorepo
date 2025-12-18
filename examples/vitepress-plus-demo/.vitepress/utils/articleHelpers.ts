/**
 * 文章导航配置接口
 */
interface ArticleNavConfig {
  topicId: string
  articleSlug: string
}

/**
 * 专题文章映射接口
 */
interface TopicArticleMap {
  [topicId: string]: string[]
}

/**
 * 获取文章导航组件的配置
 * @param topicId - 专题ID
 * @param articleSlug - 文章slug
 * @returns 组件配置对象
 */
export function getArticleNavConfig(topicId: string, articleSlug: string): ArticleNavConfig {
  return {
    topicId,
    articleSlug
  }
}

/**
 * 生成文章导航组件的HTML字符串
 * 这个函数可以帮助快速在markdown文件中插入导航组件
 * @param topicId - 专题ID
 * @param articleSlug - 文章slug
 * @returns HTML字符串
 */
export function generateArticleNavigation(topicId: string, articleSlug: string): string {
  return `
<script setup>
import ArticleNavigation from '../../.vitepress/components/ArticleNavigation.vue'
</script>

<ArticleNavigation topic-id="${topicId}" article-slug="${articleSlug}" />
`
}

/**
 * 专题和文章的映射关系，便于快速查找
 */
export const TOPIC_ARTICLE_MAP: TopicArticleMap = {
  vue: [
    'vue-intro-install',
    'vue-template-databinding',
    'vue-computed-watch',
    'vue-component-basics',
    'vue-component-props',
    'vue-events-slots',
    'vue-composition-api',
    'vue-router'
  ],
  react: ['react-intro-jsx', 'react-components-props', 'react-state-lifecycle'],
  typescript: ['typescript-intro', 'typescript-basic-types'],
  css3: ['css3-selectors', 'css3-flexbox-grid'],
  nodejs: ['nodejs-intro', 'nodejs-modules-npm'],
  java: ['java-intro', 'java-oop-basics']
}
