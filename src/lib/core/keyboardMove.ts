import type { NodeId } from './ids'
import { canHaveChildren, childrenOf, type EditorDocument } from './model'
import type { DropPosition } from './store'

export type MoveDirection = 'up' | 'down' | 'out' | 'in'

export const MOVE_KEYS: Record<string, MoveDirection> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'out',
  ArrowRight: 'in',
}

export function resolveKeyboardMove(
  doc: EditorDocument,
  id: NodeId,
  direction: MoveDirection,
): DropPosition | null {
  const node = doc.nodes[id]
  if (!node || id === doc.rootId) return null

  const parentId = node.parentId
  if (!parentId) return null

  const siblings = childrenOf(doc, parentId)
  const position = siblings.indexOf(id)
  if (position === -1) return null

  if (direction === 'up') {
    return position > 0 ? { parentId, index: position - 1 } : null
  }

  if (direction === 'down') {
    return position < siblings.length - 1 ? { parentId, index: position + 2 } : null
  }

  if (direction === 'out') {
    if (parentId === doc.rootId) return null
    const grandParentId = doc.nodes[parentId]?.parentId
    if (!grandParentId) return null
    const parentIndex = childrenOf(doc, grandParentId).indexOf(parentId)
    if (parentIndex === -1) return null
    return { parentId: grandParentId, index: parentIndex + 1 }
  }

  if (position === 0) return null
  const previousId = siblings[position - 1]
  const previous = doc.nodes[previousId]
  if (!previous || !canHaveChildren(previous)) return null
  return { parentId: previousId, index: previous.children.length }
}
