import { generateArticleNavigation, TOPIC_ARTICLE_MAP } from '../utils/articleHelpers.js'

/**
 * 批量生成所有文章的导航代码
 */
function generateAllNavigations() {
  const results = {}

  // 遍历所有专题
  Object.keys(TOPIC_ARTICLE_MAP).forEach(topicId => {
    results[topicId] = {}

    // 为每个专题的所有文章生成导航代码
    TOPIC_ARTICLE_MAP[topicId].forEach(articleSlug => {
      const navigationCode = generateArticleNavigation(topicId, articleSlug)
      results[topicId][articleSlug] = navigationCode
    })
  })

  return results
}

/**
 * 为特定专题生成导航代码
 */
function generateTopicNavigations(topicId) {
  if (!TOPIC_ARTICLE_MAP[topicId]) {
    throw new Error(`Topic "${topicId}" not found`)
  }

  const results = {}

  TOPIC_ARTICLE_MAP[topicId].forEach(articleSlug => {
    const navigationCode = generateArticleNavigation(topicId, articleSlug)
    results[articleSlug] = navigationCode

    // 打印到控制台，方便复制粘贴
    console.log(`\n=== ${topicId}/${articleSlug} ===`)
    console.log(navigationCode)
  })

  return results
}

/**
 * 验证文章是否存在于映射表中
 */
function validateArticle(topicId, articleSlug) {
  if (!TOPIC_ARTICLE_MAP[topicId]) {
    return { valid: false, error: `Topic "${topicId}" not found` }
  }

  if (!TOPIC_ARTICLE_MAP[topicId].includes(articleSlug)) {
    return {
      valid: false,
      error: `Article "${articleSlug}" not found in topic "${topicId}"`
    }
  }

  return { valid: true }
}

// 使用示例
console.log('=== 为Vue专题生成所有导航代码 ===')
generateTopicNavigations('vue')

// 验证示例
const validation = validateArticle('vue', 'vue-intro-install')
console.log('Validation result:', validation)

export { generateAllNavigations, generateTopicNavigations, validateArticle }
