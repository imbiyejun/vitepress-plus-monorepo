import { parse } from '@babel/parser'
import traverseModule from '@babel/traverse'
import generateModule from '@babel/generator'
import * as t from '@babel/types'
import type { NodePath } from '@babel/traverse'
import prettier from 'prettier'

// Handle ESM/CJS compatibility
const traverse =
  (traverseModule as unknown as { default: typeof traverseModule }).default || traverseModule
const generate =
  (generateModule as unknown as { default: typeof generateModule }).default || generateModule

/**
 * Generate formatted code from AST
 */
async function generateCode(ast: t.File): Promise<string> {
  const output = generate(
    ast,
    {
      retainLines: false,
      compact: false,
      concise: false
    },
    ''
  )

  // Format with prettier
  const formatted = await prettier.format(output.code, {
    parser: 'typescript',
    semi: false,
    singleQuote: true,
    trailingComma: 'none',
    printWidth: 100,
    tabWidth: 2
  })

  return formatted
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
