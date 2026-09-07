import type { KeyboardEvent } from 'react'
import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import { labelOf } from '../../core/model'
import { copySubtree, readClipboard } from '../../core/clipboard'
import { useEditorStoreApi } from '../Editor/context'
import { siblingsOf, type LayerRowInfo } from './flatten'

export function useTreeKeyboard(rows: LayerRowInfo[]) {
  const store = useEditorStoreApi()

  return function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey) return
    const state = store.getState()
    const { doc, selectedId } = state
    const modifier = event.metaKey || event.ctrlKey
    const key = event.key.toLowerCase()

    if (!selectedId) {
      if (event.key === 'ArrowDown' && rows.length > 0) {
        event.preventDefault()
        state.select(rows[0].id)
      }
      return
    }

    if (modifier && key === 'd') {
      event.preventDefault()
      state.duplicateNode(selectedId)
      return
    }

    if (modifier && (key === 'c' || key === 'x')) {
      event.preventDefault()
      const node = doc.nodes[selectedId]
      if (!copySubtree(doc, selectedId)) return
      const name = node ? labelOf(node) : 'elemento'
      if (key === 'x') {
        state.removeNode(selectedId)
        announce(`${name} recortado`)
        return
      }
      announce(`${name} copiado`)
      return
    }

    if (modifier && key === 'v') {
      event.preventDefault()
      const clip = readClipboard()
      const parentId = doc.nodes[selectedId]?.parentId
      if (!clip || !parentId) return
      const siblings = siblingsOf(doc, selectedId)
      state.insertHtml(clip, { parentId, index: siblings.indexOf(selectedId) + 1 })
      announce('elemento colado')
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      const node = doc.nodes[selectedId]
      state.removeNode(selectedId)
      if (node) announce(`${labelOf(node)} removido`)
      return
    }

    const index = rows.findIndex((row) => row.id === selectedId)
    if (index === -1) return
    const row = rows[index]

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const next = rows[index + 1]
      if (next) state.select(next.id)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const previous = rows[index - 1]
      if (previous) state.select(previous.id)
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      if (!row.hasChildren) return
      if (state.collapsed[selectedId]) {
        state.setCollapsed(selectedId, false)
        return
      }
      const first = rows[index + 1]
      if (first) state.select(first.id)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (row.hasChildren && !state.collapsed[selectedId]) {
        state.setCollapsed(selectedId, true)
        return
      }
      const parentId = doc.nodes[selectedId]?.parentId
      if (parentId && parentId !== doc.rootId) state.select(parentId)
    }
  }
}
