import type { ItemMode } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item'
import type { NodeId } from '../../core/ids'
import { contentChildrenOf, type AnyNode, type EditorDocument } from '../../core/model'

export type LayerRowInfo = {
  id: NodeId
  level: number
  mode: ItemMode
  hasChildren: boolean
  isMatch: boolean
}

export type LayerFilter = (node: AnyNode) => boolean

export function flattenTree(
  doc: EditorDocument,
  collapsed: Record<NodeId, true>,
  filter?: LayerFilter,
): LayerRowInfo[] {
  const visible = filter ? visibleUnder(doc, filter) : null
  const rows: LayerRowInfo[] = []

  function shownChildren(id: NodeId): NodeId[] {
    const children = contentChildrenOf(doc, id)
    return visible ? children.filter((child) => visible.has(child)) : children
  }

  function walk(ids: NodeId[], level: number) {
    for (let index = 0; index < ids.length; index += 1) {
      const id = ids[index]
      const node = doc.nodes[id]
      if (!node) continue

      const hasChildren = contentChildrenOf(doc, id).length > 0
      const children = shownChildren(id)
      const isExpanded = children.length > 0 && (visible !== null || !collapsed[id])
      const isLast = index === ids.length - 1

      rows.push({
        id,
        level,
        mode: isExpanded ? 'expanded' : isLast ? 'last-in-group' : 'standard',
        hasChildren,
        isMatch: visible ? visible.get(id) === true : true,
      })

      if (isExpanded) walk(children, level + 1)
    }
  }

  walk(shownChildren(doc.rootId), 0)
  return rows
}

function visibleUnder(doc: EditorDocument, filter: LayerFilter): Map<NodeId, boolean> {
  const out = new Map<NodeId, boolean>()
  collectVisible(doc, doc.rootId, filter, out)
  return out
}

function collectVisible(
  doc: EditorDocument,
  id: NodeId,
  filter: LayerFilter,
  out: Map<NodeId, boolean>,
): boolean {
  let any = false
  for (const child of contentChildrenOf(doc, id)) {
    const node = doc.nodes[child]
    if (!node) continue
    const matched = filter(node)
    const hasMatchBelow = collectVisible(doc, child, filter, out)
    if (matched) out.set(child, true)
    else if (hasMatchBelow) out.set(child, false)
    any = any || matched || hasMatchBelow
  }
  return any
}

export function createLayerFilter(query: string): LayerFilter | null {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return null
  return (node) => terms.every((term) => termMatches(node, term))
}

function termMatches(node: AnyNode, term: string): boolean {
  if (node.kind === 'text' || node.kind === 'comment') {
    return node.value.toLowerCase().includes(term)
  }
  const id = node.attrs.id?.toLowerCase()
  if (term.startsWith('#')) return id !== undefined && id.includes(term.slice(1))
  if (term.startsWith('.')) {
    const needle = term.slice(1)
    return node.classes.some((cls) => cls.toLowerCase().includes(needle))
  }
  return (
    node.tag.toLowerCase().includes(term) ||
    (id !== undefined && id.includes(term)) ||
    node.classes.some((cls) => cls.toLowerCase().includes(term))
  )
}

/** Visible ids from `anchorId` to `targetId` inclusive, anchor first. Falls back to `[targetId]` when the anchor is hidden. */
export function rowsBetween(
  rows: readonly LayerRowInfo[],
  anchorId: NodeId | null,
  targetId: NodeId,
): NodeId[] {
  const anchorIndex = anchorId ? rows.findIndex((row) => row.id === anchorId) : -1
  const targetIndex = rows.findIndex((row) => row.id === targetId)
  if (anchorIndex === -1 || targetIndex === -1) return [targetId]
  const from = Math.min(anchorIndex, targetIndex)
  const to = Math.max(anchorIndex, targetIndex)
  const range = rows.slice(from, to + 1).map((row) => row.id)
  return [rows[anchorIndex].id, ...range.filter((id) => id !== rows[anchorIndex].id)]
}

/** Siblings of `id` in real document order (includes layout whitespace — use it to compute insertion indices). */
export function siblingsOf(doc: EditorDocument, id: NodeId): NodeId[] {
  const parentId = doc.nodes[id]?.parentId
  if (!parentId) return []
  const parent = doc.nodes[parentId]
  return parent && parent.kind === 'element' ? parent.children : []
}
