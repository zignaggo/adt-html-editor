import type { NodeId } from '../../../core/ids'
import { isLockedDeep, type LockMap } from '../../../core/lock'
import { isStyled, type EditorDocument } from '../../../core/model'

export type MenuActionId =
  | 'duplicate'
  | 'delete'
  | 'copy'
  | 'paste'
  | 'copy-style'
  | 'paste-style'
  | 'select-parent'
  | 'lock'

export type MenuAction = {
  id: MenuActionId
  label: string
  disabled: boolean
  /** Starts a new group in the rendered menu. */
  separatorBefore?: boolean
}

export type MenuContext = {
  doc: EditorDocument
  selectedIds: readonly NodeId[]
  locked: LockMap
  hasClipboard: boolean
  hasStyle: boolean
}

function editable(context: MenuContext): boolean {
  const { doc, selectedIds, locked } = context
  if (selectedIds.length === 0) return false
  return selectedIds.every(
    (id) => doc.nodes[id] !== undefined && id !== doc.rootId && !isLockedDeep(doc, locked, id),
  )
}

function styledSingle(context: MenuContext): boolean {
  if (context.selectedIds.length !== 1) return false
  const node = context.doc.nodes[context.selectedIds[0]]
  return node !== undefined && isStyled(node)
}

function parentOf(context: MenuContext): NodeId | null {
  if (context.selectedIds.length !== 1) return null
  const parentId = context.doc.nodes[context.selectedIds[0]]?.parentId ?? null
  return parentId && parentId !== context.doc.rootId ? parentId : null
}

export function allLocked(context: MenuContext): boolean {
  const { selectedIds, locked } = context
  return selectedIds.length > 0 && selectedIds.every((id) => Boolean(locked[id]))
}

/**
 * What the context menu offers for the current selection. Entries that do not apply are
 * disabled rather than dropped, so the menu keeps the same shape wherever it opens.
 */
export function menuActionsFor(context: MenuContext): MenuAction[] {
  const canEdit = editable(context)
  const single = styledSingle(context)
  const locked = allLocked(context)

  return [
    { id: 'duplicate', label: 'Duplicate', disabled: !canEdit },
    { id: 'delete', label: 'Delete', disabled: !canEdit },
    { id: 'copy', label: 'Copy', disabled: context.selectedIds.length === 0, separatorBefore: true },
    { id: 'paste', label: 'Paste', disabled: !context.hasClipboard || !canEdit },
    {
      id: 'copy-style',
      label: 'Copy style',
      disabled: !single,
      separatorBefore: true,
    },
    { id: 'paste-style', label: 'Paste style', disabled: !context.hasStyle || !canEdit },
    {
      id: 'select-parent',
      label: 'Select parent',
      disabled: parentOf(context) === null,
      separatorBefore: true,
    },
    {
      id: 'lock',
      label: locked ? 'Unlock' : 'Lock',
      disabled: context.selectedIds.length === 0,
    },
  ]
}

export function parentTarget(context: MenuContext): NodeId | null {
  return parentOf(context)
}
