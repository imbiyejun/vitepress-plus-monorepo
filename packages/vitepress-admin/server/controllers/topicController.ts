import { Request, Response } from 'express'
import { promises as fs } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { acquireLock, releaseLock } from '../utils/file-lock'
import { backupFile, restoreFile } from '../utils/backup'
import matter from 'gray-matter'
import { syncTopicData, deleteTopicData } from '../services/topic-sync'
import { sendSuccess, sendError } from '../utils/response'

// 获取项目根目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..', '..')
const PROJECT_ROOT = join(__dirname, '..', '..')

const TOPICS_DIR = join(PROJECT_ROOT, 'docs', 'topics')
const TOPICS_DATA_DIR = join(PROJECT_ROOT, 'docs', '.vitepress', 'topics', 'data')
const DOCS_DIR = join(PROJECT_ROOT, 'docs')
const ARTICLES_DIR = join(DOCS_DIR, 'articles')

interface TopicMetadata {
  title: string
  description: string
  layout?: string
}

// Parse topic content (unused for now)
const _parseTopicContent = (content: string): TopicMetadata => {
  const { data } = matter(content)
  return {
    title: data.title || '',
    description: data.description || '',
    layout: data.layout
  }
}

export const readTopicConfig = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params
    const filePath = join(TOPICS_DIR, filename)
    console.log('Reading file from:', filePath)
    const content = await fs.readFile(filePath, 'utf-8')
    sendSuccess(res, { content })
  } catch (error) {
    console.error('读取文件失败:', error)
    sendError(res, '读取文件失败', 500)
  }
}

export const updateTopicConfig = async (req: Request, res: Response) => {
  const { filename } = req.params
  const { content } = req.body
  const filePath = join(TOPICS_DIR, filename)

  try {
    await acquireLock(filePath)
    await backupFile(filePath)
    await fs.writeFile(filePath, content, 'utf-8')
    await releaseLock(filePath)

    sendSuccess(res, null, '更新成功')
  } catch (error) {
    await releaseLock(filePath)
    sendError(res, '更新文件失败', 500, error instanceof Error ? error.message : String(error))
  }
}

// 动态读取专题数据
const loadTopicData = async (slug: string) => {
  try {
    const filePath = join(TOPICS_DATA_DIR, slug, 'index.ts')
    const fileContent = await fs.readFile(filePath, 'utf-8')

    // 使用正则表达式提取 Topic 对象
    const match = fileContent.match(/export const \w+Topic: Topic = ({[\s\S]+})/m)
    if (!match) {
      throw new Error('无法解析专题数据')
    }

    // 将 TypeScript 对象字符串转换为 JavaScript 对象
    const objectStr = match[1]
      .replace(/\n\s*\/\/[^\n]*/g, '') // 移除注释
      .replace(/,(\s*[}\]])/g, '$1') // 移除尾随逗号

    // 使用 Function 构造器创建一个安全的求值环境
    const fn = new Function(`return ${objectStr}`)
    return fn()
  } catch (error) {
    console.error('读取专题数据失败:', error)
    throw error
  }
}

interface TopicListItem {
  id: string
  title: string
  description: string
  path: string
  icon: string
  articleCount: number
}

export const listTopics = async (req: Request, res: Response) => {
  try {
    // 读取专题数据目录下的所有文件夹
    const topics = await fs.readdir(TOPICS_DATA_DIR, { withFileTypes: true })
    const topicData: TopicListItem[] = []

    interface Chapter {
      articles: unknown[]
    }

    for (const topic of topics) {
      if (topic.isDirectory() && topic.name !== 'types') {
        try {
          const data = await loadTopicData(topic.name)
          const articles = (data.chapters as Chapter[]).flatMap(chapter => chapter.articles)

          topicData.push({
            id: data.slug,
            title: data.name,
            description: data.description,
            path: `${data.slug}.md`,
            icon: data.image,
            articleCount: articles.length
          })
        } catch (error) {
          console.error(`加载专题 ${topic.name} 失败:`, error)
        }
      }
    }

    sendSuccess(res, { topics: topicData })
  } catch (error) {
    console.error('获取专题列表失败:', error)
    sendError(res, '获取专题列表失败', 500)
  }
}

export const restoreTopicConfig = async (req: Request, res: Response) => {
  const { filename } = req.params
  const filePath = join(TOPICS_DIR, filename)

  try {
    await restoreFile(filePath)
    sendSuccess(res, null, '恢复成功')
  } catch (error) {
    sendError(res, '恢复文件失败', 500, error instanceof Error ? error.message : String(error))
  }
}

export const getTopicDetail = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const topic = await loadTopicData(slug)

    if (!topic) {
      return sendError(res, '专题不存在', 404)
    }

    // 直接返回原始数据，保持字段名一致
    sendSuccess(res, {
      id: topic.id,
      categoryId: topic.categoryId,
      name: topic.name,
      slug: topic.slug,
      description: topic.description,
      image: topic.image,
      chapters: topic.chapters
    })
  } catch (error) {
    console.error('获取专题详情失败:', error)
    sendError(res, '获取专题详情失败', 500)
  }
}

// 创建文章的默认内容
const createDefaultArticleContent = (title: string): string => {
  return `---
title: ${title}
description: 
---

# ${title}

`
}

// 确保目录存在
const ensureDir = async (dir: string) => {
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

interface Chapter {
  articles: Array<{ title: string; slug: string }>
}

interface TopicData {
  slug: string
  chapters: Chapter[]
}

// 同步文件系统
const syncFileSystem = async (topicData: TopicData) => {
  const topicDir = join(ARTICLES_DIR, topicData.slug)
  await ensureDir(topicDir)

  // 创建新文章文件
  for (const chapter of topicData.chapters) {
    for (const article of chapter.articles) {
      const articlePath = join(topicDir, `${article.slug}.md`)
      try {
        await fs.access(articlePath)
      } catch {
        // 文件不存在，创建新文件
        await fs.writeFile(articlePath, createDefaultArticleContent(article.title), 'utf-8')
        console.log(`Created new article file: ${articlePath}`)
      }
    }
  }
}

export const updateTopicDetail = async (req: Request, res: Response) => {
  try {
    const topicData = req.body

    // 验证必要字段
    if (!topicData.name || !topicData.slug || !Array.isArray(topicData.chapters)) {
      return sendError(res, '数据格式不正确', 400)
    }

    // 同步更新文档和配置
    try {
      // 1. 同步文件系统（创建目录和文件）
      await syncFileSystem(topicData)

      // 2. 更新专题数据
      await syncTopicData(topicData)

      // 2. 更新大类配置文件
      const configPath = join(DOCS_DIR, '.vitepress/topics/config/index.ts')
      const configContent = await fs.readFile(configPath, 'utf-8')

      // 使用正则表达式提取topics数组的内容
      const match = configContent.match(/export const topics: TopicCategory\[\] = (\[[\s\S]*?\n])/m)
      if (!match) {
        throw new Error('无法解析topics配置')
      }

      // 将TypeScript代码转换为可执行的JavaScript代码
      const arrayContent = match[1]
        .replace(/\n\s*\/\/[^\n]*/g, '') // 移除注释
        .replace(/\s*,\s*\n\s*]/g, '\n]') // 处理最后一个逗号

      // 使用Function构造器创建一个安全的求值环境
      const fn = new Function(`return ${arrayContent}`)
      interface TopicItem {
        id: string
        categoryId: string
        name: string
        slug: string
        description?: string
        image?: string
      }

      interface TopicCategory {
        id: string
        items: TopicItem[]
        [key: string]: unknown
      }

      const currentTopics = fn() as TopicCategory[]

      // 找到当前专题所在的分类
      let currentCategory: TopicCategory | null = null
      let currentTopicIndex = -1
      for (const category of currentTopics) {
        const index = category.items.findIndex(item => item.id === topicData.id)
        if (index !== -1) {
          currentCategory = category
          currentTopicIndex = index
          break
        }
      }

      const updatedTopics = [...currentTopics]

      // 如果找到了当前专题
      if (currentCategory) {
        // 检查是否需要移动到新的分类
        if (currentCategory.id !== topicData.categoryId) {
          // 从原分类中移除
          currentCategory.items.splice(currentTopicIndex, 1)

          // 添加到新分类
          const targetCategory = updatedTopics.find(
            category => category.id === topicData.categoryId
          )
          if (!targetCategory) {
            throw new Error('目标分类不存在')
          }
          targetCategory.items.push({
            id: topicData.id,
            categoryId: topicData.categoryId,
            name: topicData.name,
            slug: topicData.slug,
            description: topicData.description,
            image: topicData.image
          })
        } else {
          // 如果分类没变，只更新专题信息
          currentCategory.items[currentTopicIndex] = {
            id: topicData.id,
            categoryId: topicData.categoryId,
            name: topicData.name,
            slug: topicData.slug,
            description: topicData.description,
            image: topicData.image
          }
        }
      } else {
        // 专题未在配置中找到，说明是新专题，需要添加到指定分类
        console.log('专题未在配置中找到，尝试添加到分类:', topicData.categoryId)

        const targetCategory = updatedTopics.find(category => category.id === topicData.categoryId)

        if (!targetCategory) {
          console.error('目标分类不存在:', topicData.categoryId)
          console.error(
            '可用的分类:',
            updatedTopics.map(c => c.id)
          )
          throw new Error('专题未在配置中找到，且目标分类不存在')
        }

        // 添加新专题到目标分类
        targetCategory.items.push({
          id: topicData.id,
          categoryId: topicData.categoryId,
          name: topicData.name,
          slug: topicData.slug,
          description: topicData.description,
          image: topicData.image
        })

        console.log('成功添加新专题到分类')
      }

      type FormatValue = string | number | boolean | null | FormatObject | FormatArray
      interface FormatObject {
        [key: string]: FormatValue
      }
      type FormatArray = FormatValue[]

      // 生成新的文件内容
      const formatObject = (obj: FormatValue | TopicCategory[], indent = 0): string => {
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

      sendSuccess(res, null, '更新成功')
    } catch (syncError) {
      console.error('同步专题数据失败:', syncError)
      sendError(res, syncError instanceof Error ? syncError.message : '同步专题数据失败', 500)
    }
  } catch (error) {
    console.error('更新专题失败:', error)
    sendError(res, error instanceof Error ? error.message : '更新专题失败', 500)
  }
}

export const deleteTopic = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params

    // 加载专题数据以检查是否有文章
    const topic = await loadTopicData(slug)

    if (!topic) {
      return sendError(res, '专题不存在', 404)
    }

    // 检查专题是否有文章
    interface ChapterWithArticles {
      articles: unknown[]
    }
    const totalArticles = (topic.chapters as ChapterWithArticles[]).reduce(
      (total: number, chapter: ChapterWithArticles) => {
        return total + chapter.articles.length
      },
      0
    )

    if (totalArticles > 0) {
      return sendError(res, `无法删除专题，该专题下还有 ${totalArticles} 篇文章`, 400)
    }

    // 使用topic-sync服务删除专题数据
    await deleteTopicData(slug)
    sendSuccess(res, null, '删除专题成功')
  } catch (error) {
    console.error('删除专题失败:', error)
    sendError(res, error instanceof Error ? error.message : '删除专题失败', 500)
  }
}

interface TopicOrderItem {
  categoryId: string
  topicIds: string[]
}

export const updateTopicsOrder = async (req: Request, res: Response) => {
  try {
    const topicsOrder: TopicOrderItem[] = req.body

    // 验证请求数据
    if (
      !Array.isArray(topicsOrder) ||
      topicsOrder.some(item => !item.categoryId || !Array.isArray(item.topicIds))
    ) {
      return sendError(res, '数据格式不正确', 400)
    }

    // 读取所有专题数据
    const topics = await fs.readdir(TOPICS_DATA_DIR, { withFileTypes: true })
    const topicDataMap = new Map()

    // 加载所有专题数据
    for (const topic of topics) {
      if (topic.isDirectory() && topic.name !== 'types') {
        try {
          const data = await loadTopicData(topic.name)
          topicDataMap.set(data.slug, data)
        } catch (error) {
          console.error(`加载专题 ${topic.name} 失败:`, error)
        }
      }
    }

    // 更新每个专题的分类
    for (const { categoryId, topicIds } of topicsOrder) {
      for (const topicId of topicIds) {
        const topicData = topicDataMap.get(topicId)

        if (topicData) {
          // 只更新专题的分类ID
          const updatedTopicData = {
            ...topicData,
            categoryId
          }

          // 同步更新专题数据
          await syncTopicData(updatedTopicData)
        }
      }
    }

    // 更新 topics/config/index.ts 文件
    const configPath = join(DOCS_DIR, '.vitepress/topics/config/index.ts')
    const configContent = await fs.readFile(configPath, 'utf-8')

    // 使用正则表达式提取topics数组的内容
    const match = configContent.match(/export const topics: TopicCategory\[\] = (\[[\s\S]*?\n])/m)
    if (!match) {
      throw new Error('无法解析topics配置')
    }

    // 将TypeScript代码转换为可执行的JavaScript代码
    const arrayContent = match[1]
      .replace(/\n\s*\/\/[^\n]*/g, '') // 移除注释
      .replace(/\s*,\s*\n\s*]/g, '\n]') // 处理最后一个逗号

    // 使用Function构造器创建一个安全的求值环境
    const fn = new Function(`return ${arrayContent}`)

    // 创建一个映射来存储每个专题应该属于哪个分类
    const topicCategoryMap = new Map()
    topicsOrder.forEach(({ categoryId, topicIds }) => {
      topicIds.forEach(topicId => {
        topicCategoryMap.set(topicId, categoryId)
      })
    })

    const allCurrentTopics = fn() as Array<{
      id: string
      items: Array<{
        id: string
        categoryId: string
        [key: string]: unknown
      }>
      [key: string]: unknown
    }>

    // 从所有分类中移除已移动的专题
    const allTopics = new Map<
      string,
      {
        id: string
        categoryId: string
        [key: string]: unknown
      }
    >()
    allCurrentTopics.forEach(category => {
      category.items.forEach(item => {
        allTopics.set(item.id, {
          ...item,
          categoryId: topicCategoryMap.get(item.id) || item.categoryId
        })
      })
    })

    // 更新专题顺序
    const updatedTopics = allCurrentTopics.map(category => {
      const orderInfo = topicsOrder.find(order => order.categoryId === category.id)
      if (orderInfo) {
        // 获取属于这个分类的专题
        const items = orderInfo.topicIds
          .map(topicId => allTopics.get(topicId))
          .filter(Boolean)
          .map(item => ({
            ...item,
            categoryId: category.id // 确保categoryId正确
          }))

        return {
          ...category,
          items
        }
      } else {
        // 如果这个分类没有在topicsOrder中，清空其items（因为可能已经被移动到其他分类）
        return {
          ...category,
          items: []
        }
      }
    })

    type FormatValue = string | number | boolean | null | FormatObject | FormatArray
    interface FormatObject {
      [key: string]: FormatValue
    }
    type FormatArray = FormatValue[]

    // 生成新的文件内容
    const formatObject = (obj: FormatValue, indent = 0): string => {
      if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]'
        const items = obj.map(item => `${' '.repeat(indent + 2)}${formatObject(item, indent + 2)}`)
        return `[\n${items.join(',\n')}\n${' '.repeat(indent)}]`
      }

      if (typeof obj === 'object' && obj !== null) {
        const entries = Object.entries(obj)
        if (entries.length === 0) return '{}'
        const items = entries.map(([key, value]) => {
          const formattedValue =
            typeof value === 'string' ? `'${value}'` : formatObject(value, indent + 2)
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

    sendSuccess(res, null, '专题顺序更新成功')
  } catch (error) {
    console.error('更新专题顺序失败:', error)
    sendError(res, error instanceof Error ? error.message : '更新专题顺序失败', 500)
  }
}
