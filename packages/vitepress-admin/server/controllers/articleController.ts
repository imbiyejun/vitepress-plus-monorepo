import { Request, Response } from 'express'
// @ts-expect-error - ES module compatibility with workspace package
import { topicsData } from '@mind-palace/docs/data'
import { promises as fs } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { sendSuccess, sendError } from '../utils/response'

// Get project root directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..', '..')
const PROJECT_ROOT = join(__dirname, '..', '..')
const ARTICLES_DIR = join(PROJECT_ROOT, 'docs', 'articles')

export const getTopicArticleList = async (req: Request, res: Response) => {
  const { topicId } = req.params
  try {
    const topicData = topicsData[topicId]

    if (!topicData) {
      return sendError(res, '专题不存在', 404)
    }

    interface Chapter {
      title: string
      articles: Array<{
        slug: string
        title: string
        status: string
      }>
    }

    const articles = (topicData.chapters as Chapter[]).flatMap(chapter =>
      chapter.articles.map(article => ({
        id: article.slug,
        title: article.title,
        path: `${topicId}/${article.slug}.md`,
        createTime: new Date().toISOString(),
        status: article.status,
        chapterTitle: chapter.title
      }))
    )

    sendSuccess(res, { articles })
  } catch (error) {
    console.error('获取文章列表失败:', error)
    sendError(res, '获取文章列表失败', 500)
  }
}

// Get article content
export const getArticleContent = async (req: Request, res: Response) => {
  const { topicSlug, articleSlug } = req.params

  try {
    const articlePath = join(ARTICLES_DIR, topicSlug, `${articleSlug}.md`)

    // Check if file exists, if not create default content
    let content = ''
    try {
      await fs.access(articlePath)
      content = await fs.readFile(articlePath, 'utf-8')
    } catch {
      // File doesn't exist, create default content
      const defaultContent = `---
title: ${articleSlug}
description: 
---

# ${articleSlug}

`
      // Ensure directory exists
      const topicDir = join(ARTICLES_DIR, topicSlug)
      try {
        await fs.access(topicDir)
      } catch {
        await fs.mkdir(topicDir, { recursive: true })
      }

      // Create file with default content
      await fs.writeFile(articlePath, defaultContent, 'utf-8')
      content = defaultContent
    }

    sendSuccess(res, {
      content,
      path: `${topicSlug}/${articleSlug}.md`
    })
  } catch (error) {
    console.error('读取文章失败:', error)
    sendError(res, '读取文章失败', 500)
  }
}

// Update article content
export const updateArticleContent = async (req: Request, res: Response) => {
  const { topicSlug, articleSlug } = req.params
  const { content } = req.body

  if (typeof content !== 'string') {
    return sendError(res, '内容格式不正确', 400)
  }

  try {
    const articlePath = join(ARTICLES_DIR, topicSlug, `${articleSlug}.md`)

    // Ensure directory exists
    const topicDir = join(ARTICLES_DIR, topicSlug)
    try {
      await fs.access(topicDir)
    } catch {
      await fs.mkdir(topicDir, { recursive: true })
    }

    // Write content to file (create or update)
    await fs.writeFile(articlePath, content, 'utf-8')

    sendSuccess(
      res,
      {
        path: `${topicSlug}/${articleSlug}.md`
      },
      '保存成功'
    )
  } catch (error) {
    console.error('保存文章失败:', error)
    sendError(res, '保存文章失败', 500)
  }
}
