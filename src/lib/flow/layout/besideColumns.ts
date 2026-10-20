import type { NodeId } from '../../core/ids'
import { childrenOf, type EditorDocument } from '../../core/model'
import type { EditorActions } from '../../core/store'
import { COLUMNS_CLASSES, type FloatSide } from '../component/componentCommit'

export type BesidePlacement = {
  actions: EditorActions
  doc: EditorDocument
  id: NodeId
  anchorId: NodeId
  side: FloatSide
  anchorElement: HTMLElement | null
  fit: (id: NodeId, reference: HTMLElement | null) => void
}

export function placeBeside(placement: BesidePlacement): boolean {
  const { actions, doc, id, anchorId, side, anchorElement, fit } = placement

  const parentId = doc.nodes[anchorId]?.parentId ?? null
  if (!parentId) return false
  const at = childrenOf(doc, parentId).indexOf(anchorId)
  if (at < 0) return false

  const wrapperId = actions.insertNode(
    { tag: 'div', classes: [...COLUMNS_CLASSES] },
    { parentId, index: at },
  )
  if (!wrapperId) return false

  const moved =
    actions.moveNode(anchorId, { parentId: wrapperId, index: 0 }) &&
    actions.moveNode(id, { parentId: wrapperId, index: side === 'left' ? 0 : 1 })
  if (!moved) {
    actions.removeNode(wrapperId)
    return false
  }

  fit(anchorId, anchorElement)
  fit(id, null)
  actions.select(id)
  return true
}
