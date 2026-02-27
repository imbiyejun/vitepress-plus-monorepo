import { TOPIC_ARTICLE_MAP } from '../utils/articleHelpers'
import { topicsData } from '../data/topics'
import fs from 'fs'
import path from 'path'

/**
 * 验证文章数据一致性的工具
 */

interface ValidationStats {
  totalArticles: number
  topicCounts: Record<string, number>
}

const stats: ValidationStats = {
  totalArticles: 0,
  topicCounts: {}
}

console.log('🔍 开始验证文章数据一致性...\n')

let hasErrors = false

// 1. 验证 TOPIC_ARTICLE_MAP 与 topics.js 的一致性
console.log('📋 验证映射表与专题数据的一致性:')
Object.keys(TOPIC_ARTICLE_MAP).forEach(topicId => {
  if (!topicsData[topicId]) {
    console.error(`❌ 映射表中的专题 "${topicId}" 在 topics.js 中不存在`)
    hasErrors = true
    return
  }

  // 获取 topics.js 中的所有文章slug
  const topicArticles: string[] = []
  topicsData[topicId].chapters.forEach(chapter => {
    chapter.articles.forEach(article => {
      topicArticles.push(article.slug)
    })
  })

  // 检查映射表中的文章是否都存在于topics.js中
  TOPIC_ARTICLE_MAP[topicId].forEach(articleSlug => {
    if (!topicArticles.includes(articleSlug)) {
      console.error(`❌ 映射表中的文章 "${topicId}/${articleSlug}" 在 topics.js 中不存在`)
      hasErrors = true
    }
  })

  // 检查topics.js中的文章是否都存在于映射表中
  topicArticles.forEach(articleSlug => {
    if (!TOPIC_ARTICLE_MAP[topicId].includes(articleSlug)) {
      console.warn(`⚠️  topics.js中的文章 "${topicId}/${articleSlug}" 在映射表中不存在`)
    }
  })

  if (!hasErrors) {
    console.log(`✅ ${topicId}: ${TOPIC_ARTICLE_MAP[topicId].length} 篇文章验证通过`)
  }
})

// 2. 验证实际文件是否存在
console.log('\n📁 验证文章文件是否存在:')
Object.keys(TOPIC_ARTICLE_MAP).forEach(topicId => {
  TOPIC_ARTICLE_MAP[topicId].forEach(articleSlug => {
    const filePath = path.join(process.cwd(), 'docs', 'articles', topicId, `${articleSlug}.md`)

    if (!fs.existsSync(filePath)) {
      console.error(`❌ 文件不存在: ${filePath}`)
      hasErrors = true
    } else {
      // 检查文件是否包含导航组件
      const content = fs.readFileSync(filePath, 'utf-8')
      if (!content.includes('ArticleNavigation')) {
        console.warn(`⚠️  文件 "${topicId}/${articleSlug}.md" 可能缺少导航组件`)
      }
    }
  })
})

// 3. 统计信息
console.log('\n📊 统计信息:')
Object.keys(TOPIC_ARTICLE_MAP).forEach(topicId => {
  const count = TOPIC_ARTICLE_MAP[topicId].length
  stats.totalArticles += count
  stats.topicCounts[topicId] = count
  console.log(`  ${topicId}: ${count} 篇文章`)
})
console.log(`  总计: ${stats.totalArticles} 篇文章`)

// 4. 生成缺失文章的创建命令
console.log('\n🛠️  如果有缺失的文章文件，可以使用以下命令创建:')
Object.keys(TOPIC_ARTICLE_MAP).forEach(topicId => {
  TOPIC_ARTICLE_MAP[topicId].forEach(articleSlug => {
    const filePath = path.join(process.cwd(), 'docs', 'articles', topicId, `${articleSlug}.md`)
    if (!fs.existsSync(filePath)) {
      console.log(
        `mkdir -p docs/articles/${topicId} && cp docs/.vitepress/templates/article-template.md docs/articles/${topicId}/${articleSlug}.md`
      )
    }
  })
})

if (hasErrors) {
  console.log('\n❌ 验证失败，请修复上述错误')
  process.exit(1)
} else {
  console.log('\n✅ 验证通过！')
  process.exit(0)
}
