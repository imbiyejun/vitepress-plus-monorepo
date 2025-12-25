import { Request, Response } from 'express'
import { promises as fs } from 'fs'
import { join } from 'path'
import { acquireLock, releaseLock } from '../utils/file-lock.js'
import { backupFile, restoreFile } from '../utils/backup.js'
import { syncTopicData, deleteTopicData } from '../services/topic-sync.js'
import { sendSuccess, sendError } from '../utils/response.js'
import type { Topic } from '../types/topic.js'
import {
  getTopicsPath,
  getTopicsDataPath,
  getArticlesPath,
  getTopicsConfigPath
} from '../config/paths.js'
import { updateTopicInAST, updateTopicsOrderInAST } from '../utils/astHelper.js'

export const readTopicConfig = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params
    const filePath = join(getTopicsPath(), filename)
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
  const filePath = join(getTopicsPath(), filename)

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
    const filePath = join(getTopicsDataPath(), slug, 'index.ts')
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

export const listTopics = async (_req: Request, res: Response) => {
  try {
    // 读取专题数据目录下的所有文件夹
    const topics = await fs.readdir(getTopicsDataPath(), { withFileTypes: true })
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
  const filePath = join(getTopicsPath(), filename)

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

interface Article {
  id: string
  title: string
  slug: string
  summary?: string
  status?: string
}

interface Chapter {
  id: string
  title: string
  description?: string
  articles: Article[]
}

interface TopicUpdateData {
  id: string
  slug: string
  name: string
  categoryId: string
  description?: string
  image?: string
  chapters: Chapter[]
}

// 同步文件系统
const syncFileSystem = async (topicData: TopicUpdateData) => {
  const topicDir = join(getArticlesPath(), topicData.slug)
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

// Handle article file operations (rename/delete)
const handleArticleFileOperations = async (
  oldTopicData: TopicUpdateData,
  newTopicData: TopicUpdateData
) => {
  const topicSlug = newTopicData.slug
  const articlesDir = join(getArticlesPath(), topicSlug)

  // Create maps for easy lookup
  const oldArticlesMap = new Map<string, Article>()
  const newArticlesMap = new Map<string, Article>()

  oldTopicData.chapters.forEach(chapter => {
    chapter.articles.forEach(article => {
      oldArticlesMap.set(article.slug, article)
    })
  })

  newTopicData.chapters.forEach(chapter => {
    chapter.articles.forEach(article => {
      newArticlesMap.set(article.slug, article)
    })
  })

  // Find articles to delete (exist in old but not in new)
  for (const [oldSlug, oldArticle] of oldArticlesMap) {
    let foundInNew = false
    for (const [, newArticle] of newArticlesMap) {
      if (newArticle.id === oldArticle.id) {
        foundInNew = true
        break
      }
    }

    if (!foundInNew) {
      // Delete article file
      const oldFilePath = join(articlesDir, `${oldSlug}.md`)
      try {
        await fs.access(oldFilePath)
        await fs.unlink(oldFilePath)
        console.log(`Deleted article file: ${oldFilePath}`)
      } catch {
        // File doesn't exist, ignore
        console.log(`Article file not found, skip deletion: ${oldFilePath}`)
      }
    }
  }

  // Find articles with changed slug (need to rename)
  for (const [newSlug, newArticle] of newArticlesMap) {
    for (const [oldSlug, oldArticle] of oldArticlesMap) {
      if (newArticle.id === oldArticle.id && newSlug !== oldSlug) {
        // Rename article file
        const oldFilePath = join(articlesDir, `${oldSlug}.md`)
        const newFilePath = join(articlesDir, `${newSlug}.md`)

        try {
          await fs.access(oldFilePath)
          await fs.rename(oldFilePath, newFilePath)
          console.log(`Renamed article file: ${oldSlug}.md -> ${newSlug}.md`)
        } catch {
          // File doesn't exist, will be created by syncFileSystem
          console.log(`Article file not found, will create new: ${oldFilePath}`)
        }
        break
      }
    }
  }
}

export const updateTopicDetail = async (req: Request, res: Response) => {
  try {
    const topicData = req.body as TopicUpdateData

    // Validate required fields
    if (!topicData.name || !topicData.slug || !Array.isArray(topicData.chapters)) {
      return sendError(res, '数据格式不正确', 400)
    }

    // Load original topic data for comparison
    let oldTopicData: TopicUpdateData | null = null
    try {
      const loadedData = await loadTopicData(topicData.slug)
      // Convert loaded data to TopicUpdateData format
      oldTopicData = loadedData as unknown as TopicUpdateData
    } catch {
      console.log('Original topic data not found, treating as new topic')
    }

    // Handle article file operations if old data exists
    if (oldTopicData) {
      await handleArticleFileOperations(oldTopicData, topicData)
    }

    // 1. Sync file system (create directories and files)
    await syncFileSystem(topicData)

    // 2. Update topic data file
    await syncTopicData(topicData as unknown as Topic)

    // 3. Update topics config file using AST
    const configPath = join(getTopicsConfigPath(), 'index.ts')
    const configContent = await fs.readFile(configPath, 'utf-8')

    const updatedContent = await updateTopicInAST(
      configContent,
      topicData.id,
      topicData.categoryId,
      {
        name: topicData.name,
        slug: topicData.slug,
        description: topicData.description,
        image: topicData.image
      }
    )

    await fs.writeFile(configPath, updatedContent, 'utf-8')

    sendSuccess(res, null, '更新成功')
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

    // Validate request data
    if (
      !Array.isArray(topicsOrder) ||
      topicsOrder.some(item => !item.categoryId || !Array.isArray(item.topicIds))
    ) {
      return sendError(res, '数据格式不正确', 400)
    }

    // Load all topic data
    const topics = await fs.readdir(getTopicsDataPath(), { withFileTypes: true })
    const topicDataMap = new Map()

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

    // Update categoryId for each topic data file
    for (const { categoryId, topicIds } of topicsOrder) {
      for (const topicId of topicIds) {
        const topicData = topicDataMap.get(topicId)

        if (topicData) {
          const updatedTopicData = {
            ...topicData,
            categoryId
          }

          await syncTopicData(updatedTopicData)
        }
      }
    }

    // Update topics/config/index.ts file using AST
    const configPath = join(getTopicsConfigPath(), 'index.ts')
    const configContent = await fs.readFile(configPath, 'utf-8')

    const updatedContent = await updateTopicsOrderInAST(configContent, topicsOrder)

    await fs.writeFile(configPath, updatedContent, 'utf-8')

    sendSuccess(res, null, '专题顺序更新成功')
  } catch (error) {
    console.error('更新专题顺序失败:', error)
    sendError(res, error instanceof Error ? error.message : '更新专题顺序失败', 500)
  }
}
