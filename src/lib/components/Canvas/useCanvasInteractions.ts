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
  onClick: (event: ReactMouseEvent<HTMLElement>) => void
  onDoubleClick: (event: ReactMouseEvent<HTMLElement>) => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
}

export function useCanvasInteractions(): CanvasInteractions {
  const store = useEditorStoreApi()
  const { select, beginTextEdit, removeNode } = useEditor()

  const nodeIdAt = (event: { target: EventTarget }) =>
    (event.target as HTMLElement).closest('[data-adt-id]')?.getAttribute('data-adt-id') ?? null

  return {
    onPointerMove: (event) => setHovered(nodeIdAt(event)),
    onPointerLeave: () => setHovered(null),
    onClick: (event) => select(nodeIdAt(event)),
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

      const id = nodeIdAt(event) ?? store.state.selectedId
      if (!id) return

      if (event.key === 'Enter') {
        event.preventDefault()
        beginTextEdit(id)
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeNode(id)
      }
    },
  }
}
