import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { setHovered } from '../../core/hover'
import { isPanModifier, panModeActive } from '../../core/panMode'
import { useEditor, useEditorStoreApi } from '../Editor/context'
import { openContextMenu } from './menu/contextMenuStore'

export type CanvasInteractions = {
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
  onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void
  onClick: (event: ReactMouseEvent<HTMLElement>) => void
  onDoubleClick: (event: ReactMouseEvent<HTMLElement>) => void
  onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
}

function isToggleClick(event: ReactMouseEvent<HTMLElement>): boolean {
  return event.shiftKey
}

export function useCanvasInteractions(): CanvasInteractions {
  const store = useEditorStoreApi()
  const { select, toggleSelected, beginTextEdit, removeNodes } = useEditor()

  const nodeIdAt = (event: { target: EventTarget }) =>
    (event.target as HTMLElement).closest('[data-adt-id]')?.getAttribute('data-adt-id') ?? null

  return {
    onPointerMove: (event) => setHovered(panModeActive() ? null : nodeIdAt(event)),
    onPointerLeave: () => setHovered(null),
    onMouseDown: (event) => {
      if (event.shiftKey || isPanModifier(event)) event.preventDefault()
    },
    onClick: (event) => {
      if (isPanModifier(event) || panModeActive()) return
      const id = nodeIdAt(event)
      if (!isToggleClick(event)) {
        select(id)
        return
      }
      if (!id) return
      toggleSelected(id)
      event.currentTarget.focus({ preventScroll: true })
    },
    onContextMenu: (event) => {
      if (isPanModifier(event) || panModeActive()) return
      const id = nodeIdAt(event)
      if (!id) return
      event.preventDefault()
      // An element already part of the selection keeps it, so the menu can act on all of them.
      if (!store.state.selectedIds.includes(id)) select(id)
      openContextMenu(event.clientX, event.clientY)
    },

    onDoubleClick: (event) => {
      if (isPanModifier(event) || panModeActive()) return
      const id = nodeIdAt(event)
      if (id) beginTextEdit(id)
    },
    onKeyDown: (event) => {
      if ((event.target as HTMLElement).isContentEditable) return

      if (event.key === 'Escape') {
        select(null)
        return
      }

      const { selectedIds } = store.state
      if (selectedIds.length === 0) return

      if (event.key === 'Enter') {
        if (selectedIds.length !== 1) return
        event.preventDefault()
        beginTextEdit(selectedIds[0])
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeNodes(selectedIds)
      }
    },
  }
}
