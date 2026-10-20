import type { NodeId } from './ids'
import { ancestorIdsOf, collectSubtree, type EditorDocument } from './model'

export type LockMap = Readonly<Record<NodeId, true>>

export function isLockedDeep(doc: EditorDocument, locked: LockMap, id: NodeId): boolean {
  if (locked[id]) return true
  for (const ancestor of ancestorIdsOf(doc, id)) {
    if (locked[ancestor]) return true
  }
  return false
}

export function hasLockedDescendant(doc: EditorDocument, locked: LockMap, id: NodeId): boolean {
  for (const descendant of collectSubtree(doc, id)) {
    if (descendant !== id && locked[descendant]) return true
  }
  return false
}

export function isLockedAnywhere(doc: EditorDocument, locked: LockMap, id: NodeId): boolean {
  return isLockedDeep(doc, locked, id) || hasLockedDescendant(doc, locked, id)
}
