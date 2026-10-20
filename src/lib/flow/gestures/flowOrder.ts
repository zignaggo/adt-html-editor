import type { NodeId } from '../../core/ids'
import { childrenOf, isLayoutWhitespace, type EditorDocument } from '../../core/model'
import type { StyleReader } from '../capabilities'

export type ReorderSlot = {
  index: number
  y: number
}

type Item = {
  index: number
  top: number
  bottom: number
}

const defaultReader: StyleReader = (element) => getComputedStyle(element)

function isInlineBox(element: HTMLElement, read: StyleReader): boolean {
  return read(element).display.startsWith('inline')
}

/**
 * Where a vertical drag may drop, as model indices. Consecutive text and inline children
 * collapse into one slot so a block is never dropped into the middle of a sentence.
 * Returns `null` when the rendered tree no longer matches the model.
 */
export function reorderSlots(
  doc: EditorDocument,
  parentId: NodeId,
  root: HTMLElement,
  originTop: number,
  read: StyleReader = defaultReader,
): ReorderSlot[] | null {
  const children = childrenOf(doc, parentId)
  const items: Item[] = []
  let run: Item | null = null

  const closeRun = () => {
    if (run) items.push(run)
    run = null
  }

  const extendRun = (index: number, top: number, bottom: number) => {
    run ??= { index, top: Number.POSITIVE_INFINITY, bottom: Number.NEGATIVE_INFINITY }
    run.top = Math.min(run.top, top)
    run.bottom = Math.max(run.bottom, bottom)
  }

  for (let index = 0; index < children.length; index += 1) {
    const node = doc.nodes[children[index]]
    if (!node) return null

    if (node.kind === 'comment') continue
    if (node.kind === 'text') {
      if (!isLayoutWhitespace(node)) run ??= { index, top: Number.POSITIVE_INFINITY, bottom: Number.NEGATIVE_INFINITY }
      continue
    }

    const element = root.querySelector<HTMLElement>(`[data-adt-id="${children[index]}"]`)
    if (!element) return null

    const rect = element.getBoundingClientRect()
    const top = rect.top - originTop
    const bottom = rect.bottom - originTop

    if (isInlineBox(element, read)) {
      extendRun(index, top, bottom)
      continue
    }

    closeRun()
    items.push({ index, top, bottom })
  }
  closeRun()

  const usable = items.filter((item) => Number.isFinite(item.top) && Number.isFinite(item.bottom))
  if (usable.length === 0) return []

  const slots = usable.map((item) => ({ index: item.index, y: item.top }))
  slots.push({ index: children.length, y: usable[usable.length - 1].bottom })
  return slots
}

export function pickSlot(slots: readonly ReorderSlot[], y: number): ReorderSlot | null {
  let best: ReorderSlot | null = null
  let distance = Number.POSITIVE_INFINITY
  for (const slot of slots) {
    const candidate = Math.abs(slot.y - y)
    if (candidate >= distance) continue
    distance = candidate
    best = slot
  }
  return best
}
