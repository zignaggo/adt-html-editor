import type { ItemMode } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item'
import type { NodeId } from '../../core/ids'
import type { EditorDocument } from '../../core/model'

export type LayerRowInfo = {
  id: NodeId
  level: number
  mode: ItemMode
  hasChildren: boolean
}

export function flattenTree(
  doc: EditorDocument,
  collapsed: Record<NodeId, true>,
): LayerRowInfo[] {
  const rows: LayerRowInfo[] = []

  function walk(ids: NodeId[], level: number) {
    for (let index = 0; index < ids.length; index += 1) {
      const id = ids[index]
      const node = doc.nodes[id]
      if (!node) continue

      const children = node.kind === 'element' ? node.children : []
      const hasChildren = children.length > 0
      const isExpanded = hasChildren && !collapsed[id]
      const isLast = index === ids.length - 1

      rows.push({
        id,
        level,
        mode: isExpanded ? 'expanded' : isLast ? 'last-in-group' : 'standard',
        hasChildren,
      })

      if (isExpanded) walk(children, level + 1)
    }
  }

  const root = doc.nodes[doc.rootId]
  if (root && root.kind === 'element') walk(root.children, 0)
  return rows
}

export function siblingsOf(doc: EditorDocument, id: NodeId): NodeId[] {
  const parentId = doc.nodes[id]?.parentId
  if (!parentId) return []
  const parent = doc.nodes[parentId]
  return parent && parent.kind === 'element' ? parent.children : []
}
