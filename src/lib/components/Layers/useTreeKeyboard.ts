import type { KeyboardEvent } from 'react'
import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import { labelOf } from '../../core/model'
import { copySubtrees, readClipboard } from '../../core/clipboard'
import { sortByDocumentOrder } from '../../core/selection'
import { useEditorStoreApi } from '../Editor/context'
import { siblingsOf, type LayerRowInfo } from './flatten'

export function useTreeKeyboard(rows: LayerRowInfo[]) {
  const store = useEditorStoreApi()

  return function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey) return
    const { state, actions } = store
    const { doc, selectedId } = state
    const modifier = event.metaKey || event.ctrlKey
    const key = event.key.toLowerCase()

    if (!selectedId) {
      if (event.key === 'ArrowDown' && rows.length > 0) {
        event.preventDefault()
        actions.select(rows[0].id)
      }
      return
    }

    const selectedIds = state.selectedIds
    const anchorNode = doc.nodes[selectedId]
    const selectionName =
      selectedIds.length > 1
        ? `${selectedIds.length} elements`
        : anchorNode
          ? labelOf(anchorNode)
          : 'element'

    if (modifier && key === 'd') {
      event.preventDefault()
      actions.duplicateNodes(selectedIds)
      return
    }

    if (modifier && (key === 'c' || key === 'x')) {
      event.preventDefault()
      if (!copySubtrees(doc, sortByDocumentOrder(doc, selectedIds))) return
      if (key === 'x') {
        actions.removeNodes(selectedIds)
        announce(`${selectionName} cut`)
        return
      }
      announce(`${selectionName} copied`)
      return
    }

    if (modifier && key === 'v') {
      event.preventDefault()
      const clip = readClipboard()
      const parentId = doc.nodes[selectedId]?.parentId
      if (!clip || !parentId) return
      const siblings = siblingsOf(doc, selectedId)
      actions.insertHtml(clip, { parentId, index: siblings.indexOf(selectedId) + 1 })
      announce('element pasted')
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      actions.removeNodes(selectedIds)
      announce(`${selectionName} removed`)
      return
    }

    const index = rows.findIndex((row) => row.id === selectedId)
    if (index === -1) return
    const row = rows[index]

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const next = rows[index + 1]
      if (next) actions.select(next.id)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const previous = rows[index - 1]
      if (previous) actions.select(previous.id)
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      if (!row.hasChildren) return
      if (state.collapsed[selectedId]) {
        actions.setCollapsed(selectedId, false)
        return
      }
      const first = rows[index + 1]
      if (first) actions.select(first.id)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (row.hasChildren && !state.collapsed[selectedId]) {
        actions.setCollapsed(selectedId, true)
        return
      }
      const parentId = doc.nodes[selectedId]?.parentId
      if (parentId && parentId !== doc.rootId) actions.select(parentId)
    }
  }
}
