import { Request, Response } from 'express'
import { promises as fs } from 'fs'
import { join } from 'path'
import { sendSuccess, sendError } from '../utils/response.js'
import { loadTopicsData } from '../utils/data-loader.js'
import { getArticlesPath } from '../config/paths.js'

export const getTopicArticleList = async (req: Request, res: Response): Promise<void> => {
  const { topicId } = req.params
  try {
    const topicsData = await loadTopicsData()
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

export const getArticleContent = async (req: Request, res: Response): Promise<void> => {
  const { topicSlug, articleSlug } = req.params

  try {
    const articlesDir = getArticlesPath()
    const articlePath = join(articlesDir, topicSlug, `${articleSlug}.md`)

    let content = ''
    try {
      await fs.access(articlePath)
      content = await fs.readFile(articlePath, 'utf-8')
    } catch {
      const defaultContent = `---
title: ${articleSlug}
description: 
---

# ${articleSlug}

`
      const articlesDir = getArticlesPath()
      const topicDir = join(articlesDir, topicSlug)
      try {
        await fs.access(topicDir)
      } catch {
        await fs.mkdir(topicDir, { recursive: true })
      }

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

export const updateArticleContent = async (req: Request, res: Response): Promise<void> => {
  const { topicSlug, articleSlug } = req.params
  const { content } = req.body

  if (typeof content !== 'string') {
    return sendError(res, '内容格式不正确', 400)
  }

  try {
    const articlesDir = getArticlesPath()
    const articlePath = join(articlesDir, topicSlug, `${articleSlug}.md`)

    const topicDir = join(articlesDir, topicSlug)
    try {
      await fs.access(topicDir)
    } catch {
      await fs.mkdir(topicDir, { recursive: true })
    }

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
