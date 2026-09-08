import { useEffect, type RefObject } from 'react'
import { MOVE_KEYS } from '../../core/keyboardMove'
import { useEditorStoreApi } from './context'
import { useKeyboardMove } from './useKeyboardMove'

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function useEditorShortcuts(shellRef: RefObject<HTMLElement | null>) {
  const store = useEditorStoreApi()
  const move = useKeyboardMove()

  useEffect(() => {
    let pointerInside = false

    const onPointerDown = (event: PointerEvent) => {
      pointerInside = Boolean(shellRef.current?.contains(event.target as Node))
    }

    const isInsideEditor = (target: EventTarget | null) => {
      const shell = shellRef.current
      if (!shell) return false
      const active = document.activeElement
      const focusInside = active instanceof Node && shell.contains(active)
      if (!focusInside && !pointerInside) return false
      return !isTextEntry(target)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const direction = event.altKey ? MOVE_KEYS[event.key] : undefined
      if (direction) {
        if (!isInsideEditor(event.target)) return
        event.preventDefault()
        move(direction)
        return
      }

      if (!event.metaKey && !event.ctrlKey) return
      const key = event.key.toLowerCase()
      if (key !== 'z' && key !== 'y') return
      if (!isInsideEditor(event.target)) return

      event.preventDefault()
      if (key === 'y' || event.shiftKey) store.actions.redo()
      else store.actions.undo()
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [shellRef, store, move])
}
