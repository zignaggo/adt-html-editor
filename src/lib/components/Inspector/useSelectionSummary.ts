import { shallow } from '@tanstack/store'
import type { NodeId } from '../../core/ids'
import { commonParentOf, sortByDocumentOrder } from '../../core/selection'
import type { AnyNode } from '../../core/model'
import { useEditor, useEditorSelector } from '../Editor/context'

export type SelectionTag = { tag: string; count: number }

export type SelectionSummary = {
  ids: NodeId[]
  count: number
  nodes: AnyNode[]
  tags: SelectionTag[]
  allLocked: boolean
  anyLocked: boolean
  commonParentId: NodeId | null
  remove: () => void
  duplicate: () => void
  setLocked: (locked: boolean) => void
  selectParent: () => void
  selectOnly: (id: NodeId) => void
  deselect: (id: NodeId) => void
  clear: () => void
}

function tagOf(node: AnyNode): string {
  return node.kind === 'element' || node.kind === 'opaque' ? node.tag : node.kind
}

function tagsOf(nodes: readonly AnyNode[]): SelectionTag[] {
  const counts = new Map<string, number>()
  for (const node of nodes) {
    const tag = tagOf(node)
    counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export function useSelectionSummary(ids: readonly NodeId[]): SelectionSummary | null {
  const actions = useEditor()
  const ordered = useEditorSelector((state) => sortByDocumentOrder(state.doc, ids), {
    compare: shallow,
  })
  const nodes = useEditorSelector(
    (state) => sortByDocumentOrder(state.doc, ids).map((id) => state.doc.nodes[id]),
    { compare: shallow },
  )
  const locked = useEditorSelector(
    (state) => sortByDocumentOrder(state.doc, ids).map((id) => Boolean(state.locked[id])),
    { compare: shallow },
  )
  const commonParentId = useEditorSelector((state) =>
    commonParentOf(state.doc, sortByDocumentOrder(state.doc, ids)),
  )

  if (ordered.length < 2) return null

  const allLocked = locked.every(Boolean)

  return {
    ids: ordered,
    count: ordered.length,
    nodes,
    tags: tagsOf(nodes),
    allLocked,
    anyLocked: locked.some(Boolean),
    commonParentId,
    remove: () => actions.removeNodes(ordered),
    duplicate: () => actions.duplicateNodes(ordered),
    setLocked: (value) => actions.setLockedMany(ordered, value),
    selectParent: () => {
      if (commonParentId) actions.select(commonParentId)
    },
    selectOnly: (id) => actions.select(id),
    deselect: (id) => actions.toggleSelected(id),
    clear: () => actions.select(null),
  }
}
