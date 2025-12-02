import { ref } from 'vue'
import type { Ref } from 'vue'
import { reorder, sortByOrder } from '../utils/sort'

interface DraggableOptions<T> {
  onOrderChange?: (items: T[]) => void
  initialItems?: T[]
}

interface UseDraggableReturn<T> {
  items: Ref<T[]>
  onDragEnd: (event: { oldIndex: number; newIndex: number }) => void
  updateItems: (newItems: T[]) => void
}

export function useDraggable<T extends { id: string | number; order?: number }>(
  options: DraggableOptions<T> = {}
): UseDraggableReturn<T> {
  const { onOrderChange, initialItems = [] } = options
  const items = ref<T[]>(sortByOrder(initialItems)) as Ref<T[]>

  const onDragEnd = (event: { oldIndex: number; newIndex: number }) => {
    const { oldIndex, newIndex } = event
    if (oldIndex === newIndex) return

    const newItems = reorder(items.value, oldIndex, newIndex)
    items.value = newItems
    onOrderChange?.(newItems)
  }

  const updateItems = (newItems: T[]) => {
    items.value = sortByOrder(newItems)
  }

  return {
    items,
    onDragEnd,
    updateItems
  }
}
