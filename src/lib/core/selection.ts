import type { NodeId } from './ids'
import { isDescendantOf, type EditorDocument } from './model'

export const EMPTY_SELECTION: readonly NodeId[] = Object.freeze([]) as readonly NodeId[]

export function sameSelection(a: readonly NodeId[], b: readonly NodeId[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false
  }
  return true
}

export function normalizeSelection(doc: EditorDocument, ids: readonly NodeId[]): NodeId[] {
  const candidates: NodeId[] = []
  const seen = new Set<NodeId>()
  for (const id of ids) {
    if (seen.has(id) || id === doc.rootId || !doc.nodes[id]) continue
    seen.add(id)
    candidates.push(id)
  }
  if (candidates.length < 2) return candidates
  return candidates.filter(
    (id) => !candidates.some((other) => other !== id && isDescendantOf(doc, id, other)),
  )
}

export function sortByDocumentOrder(doc: EditorDocument, ids: readonly NodeId[]): NodeId[] {
  const wanted = new Set(ids)
  const out: NodeId[] = []
  const walk = (id: NodeId) => {
    if (wanted.has(id)) out.push(id)
    const node = doc.nodes[id]
    if (node?.kind !== 'element') return
    for (const child of node.children) walk(child)
  }
  walk(doc.rootId)
  return out
}

export function commonParentOf(doc: EditorDocument, ids: readonly NodeId[]): NodeId | null {
  if (ids.length === 0) return null
  const parentId = doc.nodes[ids[0]]?.parentId ?? null
  if (!parentId || parentId === doc.rootId) return null
  for (const id of ids) {
    if ((doc.nodes[id]?.parentId ?? null) !== parentId) return null
  }
  return parentId
}
