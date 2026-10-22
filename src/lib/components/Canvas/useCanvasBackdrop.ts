import { useEffect, type RefObject } from 'react'
import { isPanModifier, panModeActive } from '../../core/panMode'
import { useEditor, useEditorContext } from '../Editor/context'

const DRAG_SLOP = 4

const isBackdrop = (target: EventTarget | null, root: HTMLElement): boolean =>
  target instanceof Node && !root.contains(target) && target.contains(root)

export function useCanvasBackdrop(scrollRef: RefObject<HTMLElement | null>) {
  const { canvasRootRef } = useEditorContext()
  const { select } = useEditor()

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    let origin: { x: number; y: number } | null = null

    const onPointerDown = (event: PointerEvent) => {
      origin =
        event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY } : null
    }

    const onClick = (event: MouseEvent) => {
      const start = origin
      origin = null
      if (!start || event.shiftKey || isPanModifier(event) || panModeActive()) return
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_SLOP) return
      const root = canvasRootRef.current
      if (!root || !isBackdrop(event.target, root)) return
      select(null)
    }

    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('click', onClick)

    return () => {
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('click', onClick)
    }
  }, [scrollRef, canvasRootRef, select])
}
