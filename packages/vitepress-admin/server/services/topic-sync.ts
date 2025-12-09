import { promises as fs } from 'fs'
import { join } from 'path'
import matter from 'gray-matter'
import type { Topic } from '../types/topic.js'
import { getTopicsPath, getTopicsDataPath, getTopicsConfigPath } from '../config/paths.js'

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

// 更新专题的Markdown文件

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

// 更新专题的配置数据

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

// 删除主数据文件中的专题引用
async function removeFromMainDataFile(slug: string) {
  const mainDataPath = join(getTopicsDataDir(), 'index.ts')

  try {
    // 读取现有文件内容
    let content = await fs.readFile(mainDataPath, 'utf-8')

    // 删除import语句
    content = content.replace(
      new RegExp(`import\\s*{\\s*${slug}Topic\\s*}\\s*from\\s*'./${slug}'\\n?`),
      ''
    )

    // 删除topicsData中的引用
    content = content.replace(new RegExp(`\\s*${slug}:\\s*${slug}Topic,?`), '')

    // 修复格式化问题
    content = content
      // 确保所有import语句使用正确的格式
      .replace(/import\s*{([^}]+)}\s*from/g, (match, imports) => {
        return `import { ${imports.trim()} } from`
      })
      // 修复多余的空行
      .replace(/\n{3,}/g, '\n\n')
      // 确保在export语句前有一个空行
      .replace(/(\w+)\n(export)/, '$1\n\n$2')
      // 修复topicsData对象的格式
      .replace(
        /(export const topicsData: TopicsData =\s*{)([\s\S]*?)(}+)(\s*\n+\s*export)/,
        (match, start, objContent, closeBraces, end) => {
          // 提取所有有效的属性
          const props = objContent
            .split(',')
            .map((line: string) => line.trim())
            .filter((line: string) => line && !line.startsWith('}'))
            .join(',\n  ')

          return `${start}\n  ${props}\n}${end}`
        }
      )
      // 修复可能的多余空行
      .replace(/\n{3,}/g, '\n\n')

    // 写入文件
    await fs.writeFile(mainDataPath, content, 'utf-8')
  } catch (error) {
    console.error('更新主数据文件失败:', error)
    throw error
  }
}

// 从topics配置文件中删除专题
async function removeFromTopicsConfig(slug: string) {
  const configPath = join(getTopicsConfigDir(), 'index.ts')

  try {
    // 读取现有文件内容
    const content = await fs.readFile(configPath, 'utf-8')

    // 使用正则表达式提取topics数组的内容
    const match = content.match(/export const topics[^=]+=\s*(\[[\s\S]*?\n])/m)
    if (!match) {
      throw new Error('无法解析topics配置')
    }

    // 将TypeScript代码转换为可执行的JavaScript代码
    const arrayContent = match[1]
      .replace(/\n\s*\/\/[^\n]*/g, '') // 移除注释
      .replace(/\s*,\s*\n\s*]/g, '\n]') // 处理最后一个逗号

    // 使用Function构造器创建一个安全的求值环境
    const fn = new Function(`return ${arrayContent}`)
    const topics = fn()

    interface CategoryItem {
      slug: string
      [key: string]: unknown
    }

    interface Category {
      items: CategoryItem[]
      [key: string]: unknown
    }

    // 从topics中删除指定的专题
    const updatedTopics = (topics as Category[]).map(category => ({
      ...category,
      items: category.items.filter(item => item.slug !== slug)
    }))

    type FormatValue = string | number | boolean | null | FormatObject | FormatArray
    interface FormatObject {
      [key: string]: FormatValue
    }
    type FormatArray = FormatValue[]

    // 生成新的文件内容
    const formatObject = (obj: FormatValue | Category[], indent = 0): string => {
      if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]'

        const items = obj.map(
          item => `${' '.repeat(indent + 2)}${formatObject(item as FormatValue, indent + 2)}`
        )
        return `[\n${items.join(',\n')}\n${' '.repeat(indent)}]`
      }

      if (typeof obj === 'object' && obj !== null) {
        const entries = Object.entries(obj)
        if (entries.length === 0) return '{}'
        const items = entries.map(([key, value]) => {
          const formattedValue =
            typeof value === 'string'
              ? `'${value}'`
              : formatObject(value as FormatValue, indent + 2)
          return `${' '.repeat(indent + 2)}${key}: ${formattedValue}`
        })
        return `{\n${items.join(',\n')}\n${' '.repeat(indent)}}`
      }

      return String(obj)
    }

    const updatedContent = `import { TopicCategory } from './types'

export const topics: TopicCategory[] = ${formatObject(updatedTopics)}

export * from './types'
`

    // 写入文件
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
