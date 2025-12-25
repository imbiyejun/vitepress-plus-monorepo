import { promises as fs } from 'fs'
import { join } from 'path'
import matter from 'gray-matter'
import type { Topic } from '../types/topic.js'
import { getTopicsPath, getTopicsDataPath, getTopicsConfigPath } from '../config/paths.js'
import { deleteTopicFromAST, removeTopicFromDataIndexAST } from '../utils/astHelper.js'

// 日志工具函数
const log = {
  info: (message: string, ...args: unknown[]) => {
    const now = new Date().toLocaleString()
    console.log(`[${now}] ${message}`, ...args)
    console.log('-------------------')
  },
  error: (message: string, error: unknown) => {
    const now = new Date().toLocaleString()
    console.error(`[${now}] Error: ${message}`, error)
    console.log('-------------------')
  }
}

// Path getters - no more hardcoded paths
const getTopicsDir = () => getTopicsPath()
const getTopicsDataDir = () => getTopicsDataPath()
const getTopicsConfigDir = () => getTopicsConfigPath()

// 更新专题的Markdown文件 (reserved for future use)

async function _updateTopicMarkdown(topic: Topic) {
  const filePath = join(getTopicsDir(), `${topic.slug}.md`)

  // 构建frontmatter数据
  const frontmatter = {
    title: topic.name,
    description: topic.description,
    image: topic.image,
    layout: 'topic'
  }

  // 构建文章列表内容
  const content = topic.chapters
    .map(chapter => {
      const chapterContent = [
        `## ${chapter.title}`,
        chapter.description,
        '',
        chapter.articles
          .map(article => `- [${article.title}](articles/${topic.slug}/${article.slug}.md)`)
          .join('\n')
      ].join('\n')

      return chapterContent
    })
    .join('\n\n')

  // 使用gray-matter生成最终的markdown内容
  const markdown = matter.stringify(content, frontmatter)

  // 写入文件
  await fs.writeFile(filePath, markdown, 'utf-8')
}

// 更新专题的配置数据 (reserved for future use)

async function _updateTopicData(topic: Topic) {
  const filePath = join(getTopicsDataDir(), topic.slug, 'index.ts')

  // 构建数据内容
  const content = `import { Topic } from '../types'

export const ${topic.slug}Topic: Topic = ${JSON.stringify(topic, null, 2)}
`

  // 确保目录存在
  await fs.mkdir(join(getTopicsDataDir(), topic.slug), { recursive: true })

  // 写入文件
  await fs.writeFile(filePath, content, 'utf-8')

  // 更新主数据文件
  await updateMainDataFile(topic)
}

// 更新主数据文件
async function updateMainDataFile(topic: Topic) {
  const mainDataPath = join(getTopicsDataDir(), 'index.ts')

  try {
    // 读取现有文件内容
    const content = await fs.readFile(mainDataPath, 'utf-8')

    // 检查是否已经导入了该专题
    const importRegex = new RegExp(
      `import\\s*{\\s*${topic.slug}Topic\\s*}\\s*from\\s*'./${topic.slug}'`
    )
    const topicRegex = new RegExp(`${topic.slug}:\\s*${topic.slug}Topic`)

    let newContent = content

    // 如果没有导入语句，添加导入
    if (!importRegex.test(content)) {
      const importStatement = `import { ${topic.slug}Topic } from './${topic.slug}'\n`
      newContent = importStatement + newContent
    }

    // 如果没有专题数据，添加到topicsData对象中
    if (!topicRegex.test(content)) {
      newContent = newContent.replace(
        /export const topicsData: TopicsData = {/,
        `export const topicsData: TopicsData = {\n  ${topic.slug}: ${topic.slug}Topic,`
      )
    }

    // 写入文件
    await fs.writeFile(mainDataPath, newContent, 'utf-8')
  } catch (error) {
    console.error('更新主数据文件失败:', error)
    throw error
  }
}

// Remove topic from main data index file using AST
async function removeFromMainDataFile(slug: string) {
  const mainDataPath = join(getTopicsDataDir(), 'index.ts')

  try {
    const content = await fs.readFile(mainDataPath, 'utf-8')
    const updatedContent = await removeTopicFromDataIndexAST(content, slug)
    await fs.writeFile(mainDataPath, updatedContent, 'utf-8')
  } catch (error) {
    console.error('更新主数据文件失败:', error)
    throw error
  }
}

// Remove topic from topics config file using AST
async function removeFromTopicsConfig(slug: string) {
  const configPath = join(getTopicsConfigDir(), 'index.ts')

  try {
    const content = await fs.readFile(configPath, 'utf-8')
    const updatedContent = await deleteTopicFromAST(content, slug)
    await fs.writeFile(configPath, updatedContent, 'utf-8')
  } catch (error) {
    console.error('更新topics配置文件失败:', error)
    throw error
  }
}

// 生成文章ID (例如: "1.2" 表示第1章第2篇文章)
const generateArticleId = (chapterIndex: number, articleIndex: number) => {
  return `${chapterIndex + 1}.${articleIndex + 1}`
}

export const deleteTopicData = async (slug: string) => {
  try {
    // 删除专题数据目录
    const topicDataDir = join(getTopicsDataDir(), slug)
    await fs.rm(topicDataDir, { recursive: true, force: true })

    // 删除专题的Markdown文件
    const topicFile = join(getTopicsDir(), `${slug}.md`)
    try {
      await fs.unlink(topicFile)
    } catch (unlinkError: unknown) {
      // 如果文件不存在则忽略错误
      if (
        unlinkError &&
        typeof unlinkError === 'object' &&
        'code' in unlinkError &&
        unlinkError.code !== 'ENOENT'
      ) {
        throw unlinkError
      }
    }

    // 从主数据文件中删除专题引用
    await removeFromMainDataFile(slug)

    // 从topics配置文件中删除专题
    await removeFromTopicsConfig(slug)

    log.info('专题删除完成:', slug)
  } catch (error) {
    log.error('删除专题数据失败:', error)
    if (error instanceof Error) {
      throw new Error(`删除专题数据失败: ${error.message}`)
    } else {
      throw new Error(`删除专题数据失败: ${String(error)}`)
    }
  }
}

export const syncTopicData = async (topicData: Topic) => {
  try {
    // 处理章节和文章的id
    const processedData = {
      ...topicData,
      id: topicData.slug, // 使用slug作为id，保持一致性
      chapters: topicData.chapters.map((chapter, chapterIndex) => ({
        ...chapter,
        id: String(chapterIndex + 1),
        articles: chapter.articles.map((article, articleIndex) => ({
          ...article,
          id: generateArticleId(chapterIndex, articleIndex)
        }))
      }))
    }

    // 格式化数据
    const formattedData = JSON.stringify(processedData, null, 2)
      .replace(/"/g, "'") // 先将所有双引号转换为单引号
      .replace(/'([^']+)':/g, '$1:') // 然后移除键名的引号

    // 保存到配置文件
    const configPath = join(getTopicsDataDir(), `${topicData.slug}`, 'index.ts')
    const dirPath = join(getTopicsDataDir(), topicData.slug)

    log.info('开始创建目录:', dirPath)
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (mkdirError) {
      log.error('创建目录失败:', mkdirError)
      throw mkdirError
    }

    log.info('开始写入文件:', configPath)
    const fileContent = `import { Topic } from '../types'\n\nexport const ${topicData.slug}Topic: Topic = ${formattedData}\n`
    try {
      await fs.writeFile(configPath, fileContent, 'utf-8')
    } catch (writeError) {
      log.error('写入文件失败:', writeError)
      throw writeError
    }

    log.info('专题同步完成:', topicData.slug)
  } catch (error) {
    log.error('同步专题数据失败:', error)
    // 确保错误消息被正确传递
    if (error instanceof Error) {
      throw new Error(`同步专题数据失败: ${error.message}`)
    } else {
      throw new Error(`同步专题数据失败: ${String(error)}`)
    }
  }
}
