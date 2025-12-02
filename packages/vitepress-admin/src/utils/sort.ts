/**
 * 排序工具函数
 */

interface Sortable {
  id: string | number
  order?: number
}

/**
 * 更新数组中元素的排序
 * @param items 要排序的数组
 * @param oldIndex 原始位置
 * @param newIndex 新位置
 */
export function reorder<T extends Sortable>(items: T[], oldIndex: number, newIndex: number): T[] {
  const result = Array.from(items)
  const [removed] = result.splice(oldIndex, 1)
  result.splice(newIndex, 0, removed)

  // 更新order字段
  return result.map((item, index) => ({
    ...item,
    order: index
  }))
}

/**
 * 根据order字段对数组进行排序
 * @param items 要排序的数组
 */
export function sortByOrder<T extends Sortable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const orderA = a.order ?? 0
    const orderB = b.order ?? 0
    return orderA - orderB
  })
}
