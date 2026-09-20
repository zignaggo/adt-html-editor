import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { setHovered } from '../../core/hover'
import { useEditor, useEditorStoreApi } from '../Editor/context'

export type CanvasInteractions = {
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
  onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void
  onClick: (event: ReactMouseEvent<HTMLElement>) => void
  onDoubleClick: (event: ReactMouseEvent<HTMLElement>) => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
}

function isToggleClick(event: ReactMouseEvent<HTMLElement>): boolean {
  return event.shiftKey || event.metaKey || event.ctrlKey
}

export function useCanvasInteractions(): CanvasInteractions {
  const store = useEditorStoreApi()
  const { select, toggleSelected, beginTextEdit, removeNodes } = useEditor()

  const nodeIdAt = (event: { target: EventTarget }) =>
    (event.target as HTMLElement).closest('[data-adt-id]')?.getAttribute('data-adt-id') ?? null

  return {
    onPointerMove: (event) => setHovered(nodeIdAt(event)),
    onPointerLeave: () => setHovered(null),
    onMouseDown: (event) => {
      if (event.shiftKey) event.preventDefault()
    },
    onClick: (event) => {
      const id = nodeIdAt(event)
      if (!isToggleClick(event)) {
        select(id)
        return
      }
      if (!id) return
      toggleSelected(id)
      event.currentTarget.focus({ preventScroll: true })
    },
    onDoubleClick: (event) => {
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
