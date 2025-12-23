import { Request, Response } from 'express'
import { promises as fs } from 'fs'
import { join } from 'path'
import { sendSuccess, sendError } from '../utils/response.js'
import { getTopicsConfigPath, getTopicsDataPath } from '../config/paths.js'
import {
  addCategoryToAST,
  deleteCategoryFromAST,
  updateCategoryInAST,
  reorderCategoriesInAST,
  addTopicToAST
} from '../utils/astHelper.js'

// Type definitions
interface TopicCategory {
  id: string
  title: string
  slug: string
  items: TopicItem[]
}

interface TopicItem {
  id: string
  categoryId?: string
  name: string
  slug: string
  description?: string
  image?: string
}

interface Chapter {
  title: string
  articles?: Article[]
}

interface Article {
  title: string
  path: string
}

interface TopicData {
  chapters?: Chapter[]
}

// Path getters
const getTopicsConfigFile = () => join(getTopicsConfigPath(), 'index.ts')
const getTopicsDataDir = () => getTopicsDataPath()

// 从文件中读取topics配置
const readTopicsConfig = async (): Promise<TopicCategory[]> => {
  try {
    const content = await fs.readFile(getTopicsConfigFile(), 'utf-8')

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
    return fn() as TopicCategory[]
  } catch (error) {
    console.error('读取topics配置失败:', error)
    throw error
  }
}

// 动态读取专题数据以获取文章数量
const loadTopicData = async (slug: string): Promise<TopicData | null> => {
  try {
    const filePath = join(getTopicsDataDir(), slug, 'index.ts')
    const fileContent = await fs.readFile(filePath, 'utf-8')

    // 使用正则表达式提取 Topic 对象
    const match = fileContent.match(/export const \w+Topic: Topic = ({[\s\S]+})/)
    if (!match) {
      return null
    }

    // 将单引号转换为双引号以便 JSON.parse
    const jsonStr = match[1].replace(/'/g, '"').replace(/([{,]\s*)(\w+):/g, '$1"$2":')
    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('读取专题数据失败:', error)
    return null
  }
}

// 获取所有专题大类
export const getCategories = async (_req: Request, res: Response) => {
  try {
    // 设置响应头，禁用缓存
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
    })

    const topics = await readTopicsConfig()
    const categories = await Promise.all(
      topics.map(async category => {
        const topicsWithArticleCount = await Promise.all(
          category.items.map(async item => {
            // 尝试加载专题数据以获取文章数量
            const topicData = await loadTopicData(item.slug)
            const articleCount =
              topicData?.chapters?.reduce((total: number, chapter: Chapter) => {
                return total + (chapter.articles?.length || 0)
              }, 0) || 0

            return {
              id: item.slug,
              title: item.name,
              description: item.description,
              path: `/topics/${item.slug}`,
              icon: item.image,
              articleCount,
              categoryId: category.id // 添加 categoryId
            }
          })
        )

        return {
          id: category.id,
          name: category.title,
          slug: category.slug || category.id.toLowerCase().replace(/\s+/g, '-'), // 兼容旧数据
          topics: topicsWithArticleCount
        }
      })
    )

    sendSuccess(res, { categories })
  } catch (error) {
    console.error('获取专题大类失败:', error)
    sendError(res, '获取专题大类失败', 500)
  }
}

// 添加新的专题大类
export const addCategory = async (req: Request, res: Response) => {
  try {
    const { title, slug } = req.body
    if (!title || !slug) {
      return sendError(res, '分类名称和标识不能为空', 400)
    }

    // 验证slug格式
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return sendError(res, '分类标识只能包含小写字母、数字和连字符', 400)
    }

    // 读取当前配置，检查是否已存在相同名称或标识的分类
    const topics = await readTopicsConfig()
    const existingCategory = topics.find(
      category =>
        category.title.toLowerCase() === title.toLowerCase() ||
        category.slug?.toLowerCase() === slug.toLowerCase()
    )

    if (existingCategory) {
      return sendError(res, '专题大类名称或标识已存在，请使用其他名称或标识', 400)
    }

    // Read current config file
    const fileContent = await fs.readFile(getTopicsConfigFile(), 'utf-8')

    // Use AST to add new category
    const updatedContent = await addCategoryToAST(fileContent, {
      title,
      id: slug,
      slug
    })

    // Write file
    await fs.writeFile(getTopicsConfigFile(), updatedContent, 'utf-8')

    // 返回与getCategories一致的数据结构
    sendSuccess(
      res,
      {
        id: slug,
        name: title,
        slug,
        topics: []
      },
      '添加成功'
    )
  } catch (error) {
    console.error('添加专题大类失败:', error)
    sendError(res, '添加专题大类失败', 500)
  }
}

// 更新专题大类
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { title, slug } = req.body

    if (!id || !title || !slug) {
      return sendError(res, '分类ID、名称和标识不能为空', 400)
    }

    // 验证slug格式
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return sendError(res, '分类标识只能包含小写字母、数字和连字符', 400)
    }

    // 读取当前配置
    const topics = await readTopicsConfig()

    // 查找要更新的分类
    const categoryToUpdate = topics.find(category => category.id === id)
    if (!categoryToUpdate) {
      return sendError(res, '分类不存在', 404)
    }

    // 检查新的名称或标识是否与其他分类冲突
    const existingCategory = topics.find(
      category =>
        category.id !== id && // 排除当前分类
        (category.title.toLowerCase() === title.toLowerCase() ||
          category.slug?.toLowerCase() === slug.toLowerCase())
    )

    if (existingCategory) {
      return sendError(res, '专题大类名称或标识已存在，请使用其他名称或标识', 400)
    }

    // Read current config file
    const fileContent = await fs.readFile(getTopicsConfigFile(), 'utf-8')

    // Use AST to update category
    const updatedContent = await updateCategoryInAST(fileContent, id, { title, slug })

    // Write config file
    await fs.writeFile(getTopicsConfigFile(), updatedContent, 'utf-8')

    // Re-read updated config to get the updated category
    const updatedTopics = await readTopicsConfig()
    const updatedCategory = updatedTopics.find(cat => cat.id === slug)

    if (!updatedCategory) {
      return sendError(res, '更新后的分类未找到', 500)
    }

    // Update categoryId in topic data files
    await Promise.all(
      updatedCategory.items.map(async topic => {
        const topicDataFile = join(getTopicsDataDir(), topic.slug, 'index.ts')
        try {
          const content = await fs.readFile(topicDataFile, 'utf-8')
          const updatedContent = content.replace(
            /categoryId:\s*['"].*?['"]/,
            `categoryId: '${slug}'`
          )
          await fs.writeFile(topicDataFile, updatedContent, 'utf-8')
        } catch (error) {
          console.error(`更新专题 ${topic.slug} 的数据文件失败:`, error)
        }
      })
    )

    // Return updated category data
    sendSuccess(
      res,
      {
        id: updatedCategory.id,
        name: updatedCategory.title,
        slug: updatedCategory.slug,
        topics: updatedCategory.items.map(item => ({
          id: item.id,
          title: item.name,
          description: item.description,
          path: `/topics/${item.slug}`,
          icon: item.image
        }))
      },
      '更新成功'
    )
  } catch (error) {
    console.error('更新专题大类失败:', error)
    sendError(res, '更新专题大类失败', 500)
  }
}

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!id) {
      return sendError(res, '分类ID不能为空', 400)
    }

    // Read current config
    const topics = await readTopicsConfig()

    // Find category to delete
    const categoryToDelete = topics.find(category => category.id === id)
    if (!categoryToDelete) {
      return sendError(res, '分类不存在', 404)
    }

    // 检查分类是否有子专题
    if (categoryToDelete.items && categoryToDelete.items.length > 0) {
      return sendError(res, '该分类下还有专题，无法删除', 400)
    }

    // Read current config file
    const fileContent = await fs.readFile(getTopicsConfigFile(), 'utf-8')

    // Use AST to delete category
    const updatedContent = await deleteCategoryFromAST(fileContent, id)

    // Write file
    await fs.writeFile(getTopicsConfigFile(), updatedContent, 'utf-8')

    sendSuccess(res, null, '删除成功')
  } catch (error) {
    console.error('删除专题大类失败:', error)
    sendError(res, '删除专题大类失败', 500)
  }
}

export const updateCategoriesOrder = async (req: Request, res: Response) => {
  try {
    const { categories } = req.body
    if (!Array.isArray(categories)) {
      return sendError(res, '数据格式不正确', 400)
    }

    // Read current config
    const topics = await readTopicsConfig()

    // Validate all submitted category IDs
    const validIds = new Set(topics.map(t => t.id))
    const allIdsValid = categories.every(id => validIds.has(id))
    if (!allIdsValid) {
      return sendError(res, '存在无效的分类ID', 400)
    }

    // Read current config file
    const fileContent = await fs.readFile(getTopicsConfigFile(), 'utf-8')

    // Use AST to reorder categories
    const updatedContent = await reorderCategoriesInAST(fileContent, categories)

    // Write file
    await fs.writeFile(getTopicsConfigFile(), updatedContent, 'utf-8')

    sendSuccess(res, null, '更新成功')
  } catch (error) {
    console.error('更新分类顺序失败:', error)
    sendError(res, '更新分类顺序失败', 500)
  }
}

// 添加新的专题
export const addTopic = async (req: Request, res: Response) => {
  try {
    const { name, categoryId, description, image, slug } = req.body

    if (!name || !categoryId || !slug) {
      return sendError(res, '专题名称、所属大类和专题标识不能为空', 400)
    }

    // 读取当前配置
    const topics = await readTopicsConfig()

    // 查找指定的分类
    const category = topics.find(cat => cat.id === categoryId)
    if (!category) {
      return sendError(res, '指定的分类不存在', 404)
    }

    // 检查slug是否已存在
    const existingTopic = category.items.find(item => item.slug === slug)
    if (existingTopic) {
      return sendError(res, '专题标识已存在，请使用其他标识', 400)
    }

    // Create new topic object
    const newTopic: TopicItem = {
      id: slug,
      categoryId: categoryId,
      name: name,
      slug: slug,
      description: description || '',
      image: image || ''
    }

    // Read current config file
    const fileContent = await fs.readFile(getTopicsConfigFile(), 'utf-8')

    // Use AST to add topic to category
    const updatedContent = await addTopicToAST(fileContent, categoryId, newTopic)

    // Write config file
    await fs.writeFile(getTopicsConfigFile(), updatedContent, 'utf-8')

    // 生成专题数据文件
    await generateTopicDataFile(newTopic)

    // 更新topics数据索引文件
    await updateTopicsDataIndex(newTopic.slug)

    // 返回新创建的专题数据
    sendSuccess(
      res,
      {
        id: newTopic.id,
        categoryId: newTopic.categoryId,
        title: newTopic.name,
        description: newTopic.description,
        path: `/topics/${newTopic.slug}`,
        icon: newTopic.image
      },
      '添加成功'
    )
  } catch (error) {
    console.error('添加专题失败:', error)
    sendError(res, '添加专题失败', 500)
  }
}

// 生成专题数据文件
const generateTopicDataFile = async (topic: TopicItem): Promise<void> => {
  try {
    const topicDir = join(getTopicsDataDir(), topic.slug)

    // 创建专题目录
    await fs.mkdir(topicDir, { recursive: true })

    // 生成专题数据内容
    const topicDataContent = `import { Topic } from '../types'

export const ${topic.slug}Topic: Topic = {
  id: '${topic.slug}',
  categoryId: '${topic.categoryId}',
  name: '${topic.name}',
  slug: '${topic.slug}',
  description: '${topic.description}',
  image: '${topic.image}',
  chapters: []
}
`

    // 写入专题数据文件
    const topicDataFile = join(topicDir, 'index.ts')
    await fs.writeFile(topicDataFile, topicDataContent, 'utf-8')

    console.log(`专题数据文件已生成: ${topicDataFile}`)
  } catch (error) {
    console.error('生成专题数据文件失败:', error)
    throw error
  }
}

// 更新topics数据索引文件
const updateTopicsDataIndex = async (topicSlug: string) => {
  try {
    const indexFile = join(getTopicsDataDir(), 'index.ts')

    // 读取现有的索引文件
    let indexContent = await fs.readFile(indexFile, 'utf-8')

    // 检查是否已经导入了该专题
    if (!indexContent.includes(`import { ${topicSlug}Topic } from './${topicSlug}'`)) {
      // 添加新的导入语句
      const importStatement = `import { ${topicSlug}Topic } from './${topicSlug}'`

      // 在现有的导入语句后添加新的导入
      const importMatch = indexContent.match(/(import.*from.*\n)+/)
      if (importMatch) {
        const newImportContent = importMatch[0] + importStatement + '\n'
        indexContent = indexContent.replace(importMatch[0], newImportContent)
      }
    }

    // 更新topicsData对象，添加到末尾
    const topicsDataMatch = indexContent.match(
      /export const topicsData: TopicsData = \{([\s\S]*?)\}/
    )
    if (topicsDataMatch) {
      const currentContent = topicsDataMatch[1]
      console.log(`当前topicsData内容: ${currentContent}`)
      console.log(`检查是否包含 ${topicSlug}: ${topicSlug}Topic`)

      // 检查是否已经存在该专题
      if (!currentContent.includes(`${topicSlug}: ${topicSlug}Topic`)) {
        // 使用更可靠的方法：在最后一个属性后添加新属性
        const lines = currentContent.split('\n')
        const lastPropertyIndex = lines
          .map((line, index) => ({
            index,
            line: line.trim()
          }))
          .reverse()
          .find(item => item.line.match(/^\w+:\s+\w+Topic,?$/))?.index

        if (lastPropertyIndex !== undefined && lastPropertyIndex !== -1) {
          // 在最后一个属性后插入新属性
          // 先检查最后一个属性是否已经有逗号
          const lastLine = lines[lastPropertyIndex]
          const needsComma = !lastLine.trim().endsWith(',')

          // 如果最后一个属性没有逗号，先给它添加逗号
          if (needsComma) {
            lines[lastPropertyIndex] = lastLine.replace(/(\s*)$/, ',$1')
          }

          // 插入新属性（新属性后面不加逗号，因为它是最后一个）
          lines.splice(lastPropertyIndex + 1, 0, `  ${topicSlug}: ${topicSlug}Topic`)
          const newTopicsDataContent = lines.join('\n')
          console.log(`新的topicsData内容: ${newTopicsDataContent}`)
          indexContent = indexContent.replace(
            topicsDataMatch[0],
            `export const topicsData: TopicsData = {${newTopicsDataContent}}`
          )
        } else {
          console.log('未找到合适的插入位置')
        }
      } else {
        console.log(`专题 ${topicSlug} 已存在于 topicsData 中`)
      }
    } else {
      console.log('未找到 topicsData 对象')
    }

    // 写入更新后的索引文件
    await fs.writeFile(indexFile, indexContent, 'utf-8')

    console.log(`topics数据索引文件已更新: ${indexFile}`)
  } catch (error) {
    console.error('更新topics数据索引文件失败:', error)
    throw error
  }
}
