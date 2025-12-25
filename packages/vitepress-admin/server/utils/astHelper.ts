import { parse } from '@babel/parser'
import traverseModule from '@babel/traverse'
import generateModule from '@babel/generator'
import * as t from '@babel/types'
import type { NodePath } from '@babel/traverse'
import prettier from 'prettier'
import { getProjectRoot } from '../config/paths.js'
import path from 'path'

// Handle ESM/CJS compatibility
const traverse =
  (traverseModule as unknown as { default: typeof traverseModule }).default || traverseModule
const generate =
  (generateModule as unknown as { default: typeof generateModule }).default || generateModule

/**
 * Generate formatted code from AST
 */
async function generateCode(ast: t.File, filepath?: string): Promise<string> {
  const output = generate(
    ast,
    {
      retainLines: false,
      compact: false,
      concise: false,
      jsescOption: {
        minimal: true // Don't escape Unicode characters
      }
    },
    ''
  )

  // Use project's prettier config
  const projectRoot = getProjectRoot()
  const prettierConfig = await prettier.resolveConfig(projectRoot)

  // Determine actual filepath for formatting
  const actualFilepath = filepath || path.join(projectRoot, '.vitepress/topics/config/index.ts')

  // Format with prettier using project config
  const formatted = await prettier.format(output.code, {
    ...prettierConfig,
    parser: 'typescript',
    filepath: actualFilepath
  })

  // Ensure consistent blank lines - simple and reliable approach
  const lines = formatted.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const nextLine = lines[i + 1]

    result.push(line)

    // Ensure blank line between import and export const
    if (
      line.includes('from') &&
      line.trim().startsWith('import') &&
      nextLine &&
      nextLine.trim().startsWith('export const')
    ) {
      // Check if next line is already blank
      if (nextLine.trim() !== '') {
        result.push('')
      }
    }
    // Ensure blank line between } and export type/export *
    else if (
      line.trim() === '}' &&
      nextLine &&
      (nextLine.trim().startsWith('export type') || nextLine.trim().startsWith('export *'))
    ) {
      // Check if next line is already blank
      if (nextLine.trim() !== '') {
        result.push('')
      }
    }
    // Ensure blank line between ] and export *
    else if (line.trim() === ']' && nextLine && nextLine.trim().startsWith('export *')) {
      // Check if next line is already blank
      if (nextLine.trim() !== '') {
        result.push('')
      }
    }

    i++
  }

  return result.join('\n')
}

interface TopicItem {
  id: string
  categoryId?: string
  name: string
  slug: string
  description?: string
  image?: string
}

/**
 * Parse TypeScript config file to AST
 */
export function parseConfigFile(content: string) {
  return parse(content, {
    sourceType: 'module',
    plugins: ['typescript']
  })
}

/**
 * Convert object to AST ObjectExpression
 */
function objectToAST(obj: Record<string, unknown>): t.ObjectExpression {
  const properties: t.ObjectProperty[] = []

  for (const [key, value] of Object.entries(obj)) {
    let valueNode: t.Expression

    if (typeof value === 'string') {
      valueNode = t.stringLiteral(value)
    } else if (typeof value === 'number') {
      valueNode = t.numericLiteral(value)
    } else if (typeof value === 'boolean') {
      valueNode = t.booleanLiteral(value)
    } else if (Array.isArray(value)) {
      valueNode = arrayToAST(value)
    } else if (value && typeof value === 'object') {
      valueNode = objectToAST(value as Record<string, unknown>)
    } else {
      valueNode = t.nullLiteral()
    }

    properties.push(t.objectProperty(t.identifier(key), valueNode))
  }

  return t.objectExpression(properties)
}

/**
 * Convert array to AST ArrayExpression
 */
function arrayToAST(arr: unknown[]): t.ArrayExpression {
  const elements = arr.map(item => {
    if (typeof item === 'string') {
      return t.stringLiteral(item)
    } else if (typeof item === 'number') {
      return t.numericLiteral(item)
    } else if (typeof item === 'boolean') {
      return t.booleanLiteral(item)
    } else if (Array.isArray(item)) {
      return arrayToAST(item)
    } else if (item && typeof item === 'object') {
      return objectToAST(item as Record<string, unknown>)
    }
    return t.nullLiteral()
  })

  return t.arrayExpression(elements)
}

/**
 * Add a new category to topics array
 */
export async function addCategoryToAST(
  content: string,
  newCategory: { title: string; id: string; slug: string }
): Promise<string> {
  const ast = parseConfigFile(content)

  traverse(ast, {
    ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
      const declaration = path.node.declaration

      // Find: export const topics
      if (
        t.isVariableDeclaration(declaration) &&
        declaration.declarations[0] &&
        t.isVariableDeclarator(declaration.declarations[0]) &&
        t.isIdentifier(declaration.declarations[0].id) &&
        declaration.declarations[0].id.name === 'topics'
      ) {
        const init = declaration.declarations[0].init

        if (t.isArrayExpression(init)) {
          // Create new category object
          const categoryObj = objectToAST({
            title: newCategory.title,
            id: newCategory.id,
            slug: newCategory.slug,
            items: []
          })

          // Add to array
          init.elements.push(categoryObj)
        }
      }
    }
  })

  return await generateCode(ast)
}

/**
 * Delete a category from topics array
 */
export async function deleteCategoryFromAST(content: string, categoryId: string): Promise<string> {
  const ast = parseConfigFile(content)

  traverse(ast, {
    ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
      const declaration = path.node.declaration

      if (
        t.isVariableDeclaration(declaration) &&
        declaration.declarations[0] &&
        t.isVariableDeclarator(declaration.declarations[0]) &&
        t.isIdentifier(declaration.declarations[0].id) &&
        declaration.declarations[0].id.name === 'topics'
      ) {
        const init = declaration.declarations[0].init

        if (t.isArrayExpression(init)) {
          // Filter out the category to delete
          init.elements = init.elements.filter(element => {
            if (!t.isObjectExpression(element)) return true

            // Find id property
            const idProp = element.properties.find(
              prop =>
                t.isObjectProperty(prop) &&
                t.isIdentifier(prop.key) &&
                prop.key.name === 'id' &&
                t.isStringLiteral(prop.value) &&
                prop.value.value === categoryId
            )

            return !idProp
          })
        }
      }
    }
  })

  return await generateCode(ast)
}

/**
 * Update a category in topics array
 */
export async function updateCategoryInAST(
  content: string,
  categoryId: string,
  updates: { title?: string; slug?: string }
): Promise<string> {
  const ast = parseConfigFile(content)

  traverse(ast, {
    ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
      const declaration = path.node.declaration

      if (
        t.isVariableDeclaration(declaration) &&
        declaration.declarations[0] &&
        t.isVariableDeclarator(declaration.declarations[0]) &&
        t.isIdentifier(declaration.declarations[0].id) &&
        declaration.declarations[0].id.name === 'topics'
      ) {
        const init = declaration.declarations[0].init

        if (t.isArrayExpression(init)) {
          init.elements.forEach(element => {
            if (!t.isObjectExpression(element)) return

            // Find the category by id
            const idProp = element.properties.find(
              prop =>
                t.isObjectProperty(prop) &&
                t.isIdentifier(prop.key) &&
                prop.key.name === 'id' &&
                t.isStringLiteral(prop.value) &&
                prop.value.value === categoryId
            ) as t.ObjectProperty | undefined

            if (idProp) {
              // Update properties
              element.properties.forEach(prop => {
                if (!t.isObjectProperty(prop) || !t.isIdentifier(prop.key)) return

                if (prop.key.name === 'title' && updates.title) {
                  prop.value = t.stringLiteral(updates.title)
                }
                if (prop.key.name === 'slug' && updates.slug) {
                  prop.value = t.stringLiteral(updates.slug)
                }
                if (prop.key.name === 'id' && updates.slug) {
                  prop.value = t.stringLiteral(updates.slug)
                }
              })

              // Update items' categoryId
              const itemsProp = element.properties.find(
                prop =>
                  t.isObjectProperty(prop) && t.isIdentifier(prop.key) && prop.key.name === 'items'
              ) as t.ObjectProperty | undefined

              if (itemsProp && t.isArrayExpression(itemsProp.value) && updates.slug) {
                const newSlug = updates.slug
                itemsProp.value.elements.forEach(item => {
                  if (!t.isObjectExpression(item)) return

                  item.properties.forEach(itemProp => {
                    if (
                      t.isObjectProperty(itemProp) &&
                      t.isIdentifier(itemProp.key) &&
                      itemProp.key.name === 'categoryId'
                    ) {
                      itemProp.value = t.stringLiteral(newSlug)
                    }
                  })
                })
              }
            }
          })
        }
      }
    }
  })

  return await generateCode(ast)
}

/**
 * Reorder categories in topics array
 */
export async function reorderCategoriesInAST(
  content: string,
  categoryIds: string[]
): Promise<string> {
  const ast = parseConfigFile(content)

  traverse(ast, {
    ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
      const declaration = path.node.declaration

      if (
        t.isVariableDeclaration(declaration) &&
        declaration.declarations[0] &&
        t.isVariableDeclarator(declaration.declarations[0]) &&
        t.isIdentifier(declaration.declarations[0].id) &&
        declaration.declarations[0].id.name === 'topics'
      ) {
        const init = declaration.declarations[0].init

        if (t.isArrayExpression(init)) {
          const categoryMap = new Map<string, t.ObjectExpression>()

          // Build map of id -> category object
          init.elements.forEach(element => {
            if (!t.isObjectExpression(element)) return

            const idProp = element.properties.find(
              prop =>
                t.isObjectProperty(prop) &&
                t.isIdentifier(prop.key) &&
                prop.key.name === 'id' &&
                t.isStringLiteral(prop.value)
            ) as t.ObjectProperty | undefined

            if (idProp && t.isStringLiteral(idProp.value)) {
              categoryMap.set(idProp.value.value, element)
            }
          })

          // Reorder based on categoryIds
          const reorderedElements: t.ObjectExpression[] = categoryIds
            .map(id => categoryMap.get(id))
            .filter((item): item is t.ObjectExpression => item !== undefined)

          init.elements = reorderedElements
        }
      }
    }
  })

  return await generateCode(ast)
}

/**
 * Add a new topic to a category
 */
export async function addTopicToAST(
  content: string,
  categoryId: string,
  newTopic: TopicItem
): Promise<string> {
  const ast = parseConfigFile(content)

  traverse(ast, {
    ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
      const declaration = path.node.declaration

      if (
        t.isVariableDeclaration(declaration) &&
        declaration.declarations[0] &&
        t.isVariableDeclarator(declaration.declarations[0]) &&
        t.isIdentifier(declaration.declarations[0].id) &&
        declaration.declarations[0].id.name === 'topics'
      ) {
        const init = declaration.declarations[0].init

        if (t.isArrayExpression(init)) {
          init.elements.forEach(element => {
            if (!t.isObjectExpression(element)) return

            // Find the category by id
            const idProp = element.properties.find(
              prop =>
                t.isObjectProperty(prop) &&
                t.isIdentifier(prop.key) &&
                prop.key.name === 'id' &&
                t.isStringLiteral(prop.value) &&
                prop.value.value === categoryId
            ) as t.ObjectProperty | undefined

            if (idProp) {
              // Find items array
              const itemsProp = element.properties.find(
                prop =>
                  t.isObjectProperty(prop) && t.isIdentifier(prop.key) && prop.key.name === 'items'
              ) as t.ObjectProperty | undefined

              if (itemsProp && t.isArrayExpression(itemsProp.value)) {
                // Create new topic object
                const topicObj = objectToAST(newTopic as unknown as Record<string, unknown>)
                itemsProp.value.elements.push(topicObj)
              }
            }
          })
        }
      }
    }
  })

  return await generateCode(ast)
}

/**
 * Update a topic in topics array
 */
export async function updateTopicInAST(
  content: string,
  topicId: string,
  newCategoryId: string,
  updates: Partial<TopicItem>
): Promise<string> {
  const ast = parseConfigFile(content)

  let oldCategoryId: string | null = null
  let topicToMove: t.ObjectExpression | null = null

  // Find and remove topic from old category
  traverse(ast, {
    ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
      const declaration = path.node.declaration

      if (
        t.isVariableDeclaration(declaration) &&
        declaration.declarations[0] &&
        t.isVariableDeclarator(declaration.declarations[0]) &&
        t.isIdentifier(declaration.declarations[0].id) &&
        declaration.declarations[0].id.name === 'topics'
      ) {
        const init = declaration.declarations[0].init

        if (t.isArrayExpression(init)) {
          init.elements.forEach(element => {
            if (!t.isObjectExpression(element)) return

            const itemsProp = element.properties.find(
              prop =>
                t.isObjectProperty(prop) && t.isIdentifier(prop.key) && prop.key.name === 'items'
            ) as t.ObjectProperty | undefined

            if (itemsProp && t.isArrayExpression(itemsProp.value)) {
              const topicIndex = itemsProp.value.elements.findIndex(item => {
                if (!t.isObjectExpression(item)) return false

                const idProp = item.properties.find(
                  prop =>
                    t.isObjectProperty(prop) &&
                    t.isIdentifier(prop.key) &&
                    prop.key.name === 'id' &&
                    t.isStringLiteral(prop.value) &&
                    prop.value.value === topicId
                )
                return !!idProp
              })

              if (topicIndex !== -1) {
                const topic = itemsProp.value.elements[topicIndex]
                if (t.isObjectExpression(topic)) {
                  // Get category id
                  const catIdProp = element.properties.find(
                    prop =>
                      t.isObjectProperty(prop) &&
                      t.isIdentifier(prop.key) &&
                      prop.key.name === 'id' &&
                      t.isStringLiteral(prop.value)
                  ) as t.ObjectProperty | undefined

                  if (catIdProp && t.isStringLiteral(catIdProp.value)) {
                    oldCategoryId = catIdProp.value.value
                  }

                  // Update topic properties
                  topic.properties.forEach(prop => {
                    if (!t.isObjectProperty(prop) || !t.isIdentifier(prop.key)) return

                    const key = prop.key.name
                    if (key === 'categoryId') {
                      prop.value = t.stringLiteral(newCategoryId)
                    } else if (key === 'name' && updates.name) {
                      prop.value = t.stringLiteral(updates.name)
                    } else if (key === 'slug' && updates.slug) {
                      prop.value = t.stringLiteral(updates.slug)
                    } else if (key === 'description' && updates.description !== undefined) {
                      prop.value = t.stringLiteral(updates.description)
                    } else if (key === 'image' && updates.image !== undefined) {
                      prop.value = t.stringLiteral(updates.image)
                    }
                  })

                  // If category changed, need to move topic
                  if (oldCategoryId !== newCategoryId) {
                    topicToMove = topic
                    itemsProp.value.elements.splice(topicIndex, 1)
                  }
                }
              }
            }
          })

          // Add topic to new category if needed
          if (topicToMove && oldCategoryId !== newCategoryId) {
            init.elements.forEach(element => {
              if (!t.isObjectExpression(element)) return

              const idProp = element.properties.find(
                prop =>
                  t.isObjectProperty(prop) &&
                  t.isIdentifier(prop.key) &&
                  prop.key.name === 'id' &&
                  t.isStringLiteral(prop.value) &&
                  prop.value.value === newCategoryId
              )

              if (idProp) {
                const itemsProp = element.properties.find(
                  prop =>
                    t.isObjectProperty(prop) &&
                    t.isIdentifier(prop.key) &&
                    prop.key.name === 'items'
                ) as t.ObjectProperty | undefined

                if (itemsProp && t.isArrayExpression(itemsProp.value) && topicToMove) {
                  itemsProp.value.elements.push(topicToMove)
                }
              }
            })
          }
        }
      }
    }
  })

  return await generateCode(ast)
}

/**
 * Delete a topic from topics array
 */
export async function deleteTopicFromAST(content: string, topicId: string): Promise<string> {
  const ast = parseConfigFile(content)

  traverse(ast, {
    ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
      const declaration = path.node.declaration

      if (
        t.isVariableDeclaration(declaration) &&
        declaration.declarations[0] &&
        t.isVariableDeclarator(declaration.declarations[0]) &&
        t.isIdentifier(declaration.declarations[0].id) &&
        declaration.declarations[0].id.name === 'topics'
      ) {
        const init = declaration.declarations[0].init

        if (t.isArrayExpression(init)) {
          init.elements.forEach(element => {
            if (!t.isObjectExpression(element)) return

            const itemsProp = element.properties.find(
              prop =>
                t.isObjectProperty(prop) && t.isIdentifier(prop.key) && prop.key.name === 'items'
            ) as t.ObjectProperty | undefined

            if (itemsProp && t.isArrayExpression(itemsProp.value)) {
              itemsProp.value.elements = itemsProp.value.elements.filter(item => {
                if (!t.isObjectExpression(item)) return true

                const idProp = item.properties.find(
                  prop =>
                    t.isObjectProperty(prop) &&
                    t.isIdentifier(prop.key) &&
                    prop.key.name === 'slug' &&
                    t.isStringLiteral(prop.value) &&
                    prop.value.value === topicId
                )

                return !idProp
              })
            }
          })
        }
      }
    }
  })

  return await generateCode(ast)
}

/**
 * Remove topic from topics data index file (topics/data/index.ts)
 */
export async function removeTopicFromDataIndexAST(
  content: string,
  topicSlug: string
): Promise<string> {
  const ast = parseConfigFile(content)

  traverse(ast, {
    // Remove import statement
    ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
      const source = path.node.source.value
      if (source === `./${topicSlug}`) {
        path.remove()
      }
    },
    // Remove from topicsData object
    ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
      const declaration = path.node.declaration

      if (
        t.isVariableDeclaration(declaration) &&
        declaration.declarations[0] &&
        t.isVariableDeclarator(declaration.declarations[0]) &&
        t.isIdentifier(declaration.declarations[0].id) &&
        declaration.declarations[0].id.name === 'topicsData'
      ) {
        const init = declaration.declarations[0].init

        if (t.isObjectExpression(init)) {
          init.properties = init.properties.filter(prop => {
            if (!t.isObjectProperty(prop)) return true

            // Check if key matches topicSlug
            if (t.isIdentifier(prop.key) && prop.key.name === topicSlug) {
              return false
            }

            return true
          })
        }
      }
    }
  })

  const projectRoot = getProjectRoot()
  return await generateCode(ast, path.join(projectRoot, '.vitepress/topics/data/index.ts'))
}

/**
 * Update topics order across categories
 */
export async function updateTopicsOrderInAST(
  content: string,
  topicsOrder: Array<{ categoryId: string; topicIds: string[] }>
): Promise<string> {
  const ast = parseConfigFile(content)

  traverse(ast, {
    ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
      const declaration = path.node.declaration

      if (
        t.isVariableDeclaration(declaration) &&
        declaration.declarations[0] &&
        t.isVariableDeclarator(declaration.declarations[0]) &&
        t.isIdentifier(declaration.declarations[0].id) &&
        declaration.declarations[0].id.name === 'topics'
      ) {
        const init = declaration.declarations[0].init

        if (t.isArrayExpression(init)) {
          // Collect all topics from all categories
          const allTopicsMap = new Map<string, t.ObjectExpression>()

          init.elements.forEach(element => {
            if (!t.isObjectExpression(element)) return

            const itemsProp = element.properties.find(
              prop =>
                t.isObjectProperty(prop) && t.isIdentifier(prop.key) && prop.key.name === 'items'
            ) as t.ObjectProperty | undefined

            if (itemsProp && t.isArrayExpression(itemsProp.value)) {
              itemsProp.value.elements.forEach(item => {
                if (!t.isObjectExpression(item)) return

                const idProp = item.properties.find(
                  prop =>
                    t.isObjectProperty(prop) &&
                    t.isIdentifier(prop.key) &&
                    prop.key.name === 'id' &&
                    t.isStringLiteral(prop.value)
                ) as t.ObjectProperty | undefined

                if (idProp && t.isStringLiteral(idProp.value)) {
                  allTopicsMap.set(idProp.value.value, item)
                }
              })
            }
          })

          // Create map of topicId -> new categoryId
          const topicCategoryMap = new Map<string, string>()
          topicsOrder.forEach(({ categoryId, topicIds }) => {
            topicIds.forEach(topicId => {
              topicCategoryMap.set(topicId, categoryId)
            })
          })

          // First, clear all items arrays
          init.elements.forEach(element => {
            if (!t.isObjectExpression(element)) return

            const itemsProp = element.properties.find(
              prop =>
                t.isObjectProperty(prop) && t.isIdentifier(prop.key) && prop.key.name === 'items'
            ) as t.ObjectProperty | undefined

            if (itemsProp && t.isArrayExpression(itemsProp.value)) {
              itemsProp.value.elements = []
            }
          })

          // Then, redistribute topics to correct categories with correct order
          init.elements.forEach(element => {
            if (!t.isObjectExpression(element)) return

            const categoryIdProp = element.properties.find(
              prop =>
                t.isObjectProperty(prop) &&
                t.isIdentifier(prop.key) &&
                prop.key.name === 'id' &&
                t.isStringLiteral(prop.value)
            ) as t.ObjectProperty | undefined

            if (!categoryIdProp || !t.isStringLiteral(categoryIdProp.value)) return

            const categoryId = categoryIdProp.value.value
            const orderInfo = topicsOrder.find(order => order.categoryId === categoryId)

            if (!orderInfo) return

            const itemsProp = element.properties.find(
              prop =>
                t.isObjectProperty(prop) && t.isIdentifier(prop.key) && prop.key.name === 'items'
            ) as t.ObjectProperty | undefined

            if (itemsProp && t.isArrayExpression(itemsProp.value)) {
              // Add topics in specified order
              orderInfo.topicIds.forEach(topicId => {
                const topic = allTopicsMap.get(topicId)
                if (topic && t.isArrayExpression(itemsProp.value)) {
                  // Update categoryId in topic to match current category
                  let categoryIdUpdated = false
                  topic.properties.forEach(prop => {
                    if (
                      t.isObjectProperty(prop) &&
                      t.isIdentifier(prop.key) &&
                      prop.key.name === 'categoryId'
                    ) {
                      prop.value = t.stringLiteral(categoryId)
                      categoryIdUpdated = true
                    }
                  })

                  // If categoryId property doesn't exist, add it
                  if (!categoryIdUpdated) {
                    topic.properties.push(
                      t.objectProperty(t.identifier('categoryId'), t.stringLiteral(categoryId))
                    )
                  }

                  itemsProp.value.elements.push(topic)
                }
              })
            }
          })
        }
      }
    }
  })

  return await generateCode(ast)
}
