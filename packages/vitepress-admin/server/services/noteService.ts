import { promises as fs } from 'fs'
import { join } from 'path'
import { getArticlesPath, getTopicsDataPath, getTopicsConfigPath } from '../config/paths.js'
import { chatService } from './chatService.js'
import type { Conversation, NoteClassification, NoteProgressEvent } from '../types/chat.js'
import type { Topic } from '../types/topic.js'
import { syncTopicData } from './topic-sync.js'
import { addCategoryToAST, addTopicToAST } from '../utils/astHelper.js'

type ProgressCallback = (event: NoteProgressEvent) => void

// Slugify: convert to lowercase hyphenated unique-safe string
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

// Read existing topics config to check for duplicates
async function readTopicsConfig(): Promise<string> {
  const configPath = join(getTopicsConfigPath(), 'index.ts')
  try {
    return await fs.readFile(configPath, 'utf-8')
  } catch {
    return ''
  }
}

// Load topic data from .vitepress/topics/data/{slug}/index.ts
async function loadTopicData(slug: string): Promise<Topic | null> {
  try {
    const filePath = join(getTopicsDataPath(), slug, 'index.ts')
    const content = await fs.readFile(filePath, 'utf-8')
    const match = content.match(/export const \w+Topic: Topic = ({[\s\S]+})/m)
    if (!match) return null
    const objectStr = match[1].replace(/\n\s*\/\/[^\n]*/g, '').replace(/,(\s*[}\]])/g, '$1')
    return new Function(`return ${objectStr}`)() as Topic
  } catch {
    return null
  }
}

// Build prompt for AI to classify conversation into category/topic/article
function buildClassificationPrompt(conversation: Conversation, existingConfig: string): string {
  const chatSummary = conversation.messages
    .filter(m => m.role !== 'system')
    .map(m => `[${m.role === 'user' ? 'Q' : 'A'}]: ${m.content.slice(0, 500)}`)
    .join('\n')

  return `你是一个内容分类专家。请分析以下对话内容，为其自动归类。

现有的专题配置如下（如果对话内容适合归入已有分类，优先使用已有的 categorySlug 和 topicSlug）：
\`\`\`
${existingConfig || '暂无已有配置'}
\`\`\`

对话内容：
${chatSummary}

请返回一个 JSON 对象（不要包含其他内容，不要用 markdown 代码块包裹），格式如下：
{
  "categoryTitle": "大类中文名称",
  "categorySlug": "category-slug",
  "topicName": "专题中文名称",
  "topicSlug": "topic-slug",
  "topicDescription": "专题简短描述",
  "articleTitle": "文章中文标题",
  "articleSlug": "article-slug",
  "articleDescription": "文章简短描述"
}

要求：
1. categorySlug、topicSlug、articleSlug 必须是小写英文+连字符格式
2. 如果对话内容适合归入已有分类，直接使用已有的 categorySlug 和 topicSlug
3. 如果是新领域，创建合理的新分类
4. articleSlug 在同一个 topic 下必须唯一
5. 文章标题应该准确概括对话讨论的核心问题
6. 只返回 JSON，不要包含任何其他文字`
}

function buildNotePrompt(conversation: Conversation): string {
  const chatHistory = conversation.messages
    .filter(m => m.role !== 'system')
    .map(m => `**${m.role === 'user' ? '问' : '答'}**: ${m.content}`)
    .join('\n\n')

  return `你是一个学习笔记整理专家。请根据以下对话内容，生成一篇结构化的学习笔记。

要求：
1. 使用 Markdown 格式
2. 提取对话中的核心知识点
3. 合理组织章节结构（使用 ## 和 ### 标题）
4. 保留关键的代码示例（如有）
5. 添加简洁的总结
6. 不要包含 frontmatter（我会自动添加）
7. 第一行使用 # 作为文章主标题
8. 使用中文撰写

对话内容：

${chatHistory}`
}

// Parse AI response to get classification JSON
function parseClassification(text: string): NoteClassification | null {
  try {
    const cleaned = text
      .replace(/```(?:json)?\s*/g, '')
      .replace(/```/g, '')
      .trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0]) as NoteClassification

    // Validate and sanitize slugs
    parsed.categorySlug = slugify(parsed.categorySlug || parsed.categoryTitle)
    parsed.topicSlug = slugify(parsed.topicSlug || parsed.topicName)
    parsed.articleSlug = slugify(parsed.articleSlug || parsed.articleTitle)

    if (!parsed.categoryTitle || !parsed.topicName || !parsed.articleTitle) return null
    return parsed
  } catch {
    return null
  }
}

// Ensure articleSlug is unique within the topic
async function ensureUniqueArticleSlug(topicSlug: string, baseSlug: string): Promise<string> {
  const articlesDir = join(getArticlesPath(), topicSlug)
  let slug = baseSlug
  let counter = 1
  while (true) {
    try {
      await fs.access(join(articlesDir, `${slug}.md`))
      slug = `${baseSlug}-${counter++}`
    } catch {
      return slug
    }
  }
}

// Check if category exists in config
function categoryExistsInConfig(configContent: string, categorySlug: string): boolean {
  const regex = new RegExp(`slug:\\s*['"]${categorySlug}['"]`)
  return regex.test(configContent)
}

// Check if topic item exists in config
function topicExistsInConfig(configContent: string, topicSlug: string): boolean {
  const regex = new RegExp(`slug:\\s*['"]${topicSlug}['"]`)
  // Match inside items arrays (topic items have categoryId)
  const itemRegex = new RegExp(`id:\\s*['"]${topicSlug}['"]`)
  return regex.test(configContent) && itemRegex.test(configContent)
}

export class NoteService {
  // SSE-based note generation with auto-categorization
  async generateNote(conversationId: string, onProgress: ProgressCallback): Promise<void> {
    const conversation = chatService.getConversation(conversationId)
    if (!conversation) throw new Error('Conversation not found')
    if (conversation.messages.length < 2) throw new Error('Conversation too short to generate note')

    const provider = conversation.provider
    const model = conversation.model

    // Step 1: Classify
    onProgress({ step: 'analyzing', message: '正在分析对话内容，自动归类...' })

    const existingConfig = await readTopicsConfig()
    const classifyPrompt = buildClassificationPrompt(conversation, existingConfig)

    let classifyResult = ''
    await chatService.chat(undefined, classifyPrompt, provider, model, chunk => {
      if (!chunk.done && chunk.content) classifyResult += chunk.content
    })

    const classification = parseClassification(classifyResult)
    if (!classification) {
      onProgress({ step: 'error', message: '无法解析分类结果，请重试' })
      return
    }

    // Ensure unique article slug
    classification.articleSlug = await ensureUniqueArticleSlug(
      classification.topicSlug,
      classification.articleSlug
    )

    onProgress({ step: 'classified', classification, message: '分类完成' })

    // Step 2: Generate note content (streamed)
    onProgress({ step: 'generating', message: '正在生成学习笔记...' })

    const notePrompt = buildNotePrompt(conversation)
    let noteContent = ''

    await chatService.chat(undefined, notePrompt, provider, model, chunk => {
      if (!chunk.done && chunk.content) {
        noteContent += chunk.content
        onProgress({ step: 'generating', content: chunk.content })
      }
    })

    // Step 3: Save files
    onProgress({ step: 'saving', message: '正在保存文件...' })

    const {
      categorySlug,
      categoryTitle,
      topicSlug,
      topicName,
      topicDescription,
      articleTitle,
      articleSlug,
      articleDescription
    } = classification

    // 3a: Ensure category & topic exist in config/index.ts
    let configContent = await readTopicsConfig()

    if (!categoryExistsInConfig(configContent, categorySlug)) {
      configContent = await addCategoryToAST(configContent, {
        title: categoryTitle,
        id: categorySlug,
        slug: categorySlug
      })
      const configPath = join(getTopicsConfigPath(), 'index.ts')
      await fs.writeFile(configPath, configContent, 'utf-8')
    }

    if (!topicExistsInConfig(configContent, topicSlug)) {
      configContent = await addTopicToAST(configContent, categorySlug, {
        id: topicSlug,
        categoryId: categorySlug,
        name: topicName,
        slug: topicSlug,
        description: topicDescription,
        image: ''
      })
      const configPath = join(getTopicsConfigPath(), 'index.ts')
      await fs.writeFile(configPath, configContent, 'utf-8')
    }

    // 3b: Ensure topic data exists, append article
    let topic = await loadTopicData(topicSlug)
    if (!topic) {
      topic = {
        id: topicSlug,
        slug: topicSlug,
        name: topicName,
        description: topicDescription,
        image: '',
        categoryId: categorySlug,
        chapters: [{ id: '1', title: '笔记列表', description: '自动生成的学习笔记', articles: [] }]
      }
    }

    // Add article to first chapter if not exists
    const chapter = topic.chapters[0]
    if (chapter && !chapter.articles.some(a => a.slug === articleSlug)) {
      const articleIndex = chapter.articles.length + 1
      const chapterId = chapter.id || '1'
      chapter.articles.push({
        id: `${chapterId}.${articleIndex}`,
        title: articleTitle,
        slug: articleSlug,
        summary: articleDescription,
        status: 'completed'
      })
    }

    await syncTopicData(topic)

    // 3c: Save article markdown
    const articlesDir = getArticlesPath()
    const topicDir = join(articlesDir, topicSlug)
    await ensureDir(topicDir)

    const markdown = `---
layout: doc
title: ${articleTitle}
description: ${articleDescription}
---

${noteContent}
`
    const filePath = join(topicDir, `${articleSlug}.md`)
    await fs.writeFile(filePath, markdown, 'utf-8')

    onProgress({
      step: 'done',
      message: '笔记生成完成',
      filePath: `${topicSlug}/${articleSlug}.md`,
      classification
    })
  }
}

export const noteService = new NoteService()
