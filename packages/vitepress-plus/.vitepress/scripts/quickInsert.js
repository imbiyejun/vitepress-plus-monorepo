import { generateArticleNavigation, TOPIC_ARTICLE_MAP } from '../utils/articleHelpers.js'

/**
 * 快速生成导航代码的命令行工具
 * 使用方法：node quickInsert.js vue vue-intro-install
 */

// 获取命令行参数
const args = process.argv.slice(2)
const [topicId, articleSlug] = args

if (!topicId || !articleSlug) {
  console.log('使用方法: node quickInsert.js <专题ID> <文章slug>')
  console.log('示例: node quickInsert.js vue vue-intro-install')
  console.log('\n可用的专题:')
  Object.keys(TOPIC_ARTICLE_MAP).forEach(topic => {
    console.log(`  ${topic}: ${TOPIC_ARTICLE_MAP[topic].length} 篇文章`)
  })
  process.exit(1)
}

// 验证参数
if (!TOPIC_ARTICLE_MAP[topicId]) {
  console.error(`❌ 专题 "${topicId}" 不存在`)
  console.log('可用专题:', Object.keys(TOPIC_ARTICLE_MAP).join(', '))
  process.exit(1)
}

if (!TOPIC_ARTICLE_MAP[topicId].includes(articleSlug)) {
  console.error(`❌ 文章 "${articleSlug}" 在专题 "${topicId}" 中不存在`)
  console.log(`${topicId} 专题的可用文章:`)
  TOPIC_ARTICLE_MAP[topicId].forEach(slug => {
    console.log(`  - ${slug}`)
  })
  process.exit(1)
}

// 生成导航代码
const navigationCode = generateArticleNavigation(topicId, articleSlug)

console.log('✅ 生成成功！请复制以下代码到文章末尾：')
console.log('='.repeat(50))
console.log(navigationCode)
console.log('='.repeat(50))

// 如果是Windows，尝试复制到剪贴板
if (process.platform === 'win32') {
  try {
    const { spawn } = require('child_process')
    const clip = spawn('clip')
    clip.stdin.write(navigationCode)
    clip.stdin.end()
    console.log('📋 代码已复制到剪贴板！')
  } catch (error) {
    console.log('💡 提示：手动复制上面的代码')
  }
}
