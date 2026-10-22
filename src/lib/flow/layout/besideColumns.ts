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

export type WrapPlacement = {
  actions: EditorActions
  doc: () => EditorDocument
  ids: readonly NodeId[]
  anchorId?: NodeId
  classes: readonly string[]
  fit: (id: NodeId) => void
}

export function wrapTogether(placement: WrapPlacement): NodeId | null {
  const { actions, doc, ids, classes, fit } = placement
  if (ids.length === 0) return null

  const anchorId = placement.anchorId ?? ids[0]
  const parentId = doc().nodes[anchorId]?.parentId ?? null
  if (!parentId) return null
  const at = childrenOf(doc(), parentId).indexOf(anchorId)
  if (at < 0) return null

  const wrapperId = actions.insertNode(
    { tag: 'div', classes: [...classes] },
    { parentId, index: at },
  )
  if (!wrapperId) return null

  let index = 0
  for (const id of ids) {
    if (!actions.moveNode(id, { parentId: wrapperId, index })) {
      actions.removeNode(wrapperId)
      return null
    }
    index += 1
  }

  for (const id of ids) fit(id)
  return wrapperId
}

export function placeBeside(placement: BesidePlacement): boolean {
  const { actions, doc, id, anchorId, side, anchorElement, fit } = placement

  const wrapperId = wrapTogether({
    actions,
    doc: () => doc,
    ids: side === 'left' ? [id, anchorId] : [anchorId, id],
    anchorId,
    classes: COLUMNS_CLASSES,
    fit: (memberId) => fit(memberId, memberId === anchorId ? anchorElement : null),
  })
  if (!wrapperId) return false

  actions.select(id)
  return true
}
