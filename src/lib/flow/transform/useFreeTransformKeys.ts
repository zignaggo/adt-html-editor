import { useEffect, useRef } from 'react'
import { NUDGE_COARSE_PX, NUDGE_PX, type FreeTransform } from './useFreeTransform'
import { setTransformActive } from './transformStore'

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

/**
 * Arrow keys nudge the offset and Escape leaves the mode. The canvas calls this and the
 * inspector does not: both render their own `useFreeTransform`, and two listeners would
 * move the element twice per key.
 */
export function useFreeTransformKeys(transform: FreeTransform | null): void {
  const active = transform?.active ?? false
  const transformRef = useRef(transform)

  useEffect(() => {
    transformRef.current = transform
  })

  useEffect(() => {
    if (!active) return

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.isContentEditable) return
      if (event.key === 'Escape') {
        setTransformActive(false)
        return
      }
      const arrow = ARROWS[event.key]
      if (!arrow) return
      event.preventDefault()
      const step = event.shiftKey ? NUDGE_COARSE_PX : NUDGE_PX
      transformRef.current?.nudge(arrow[0] * step, arrow[1] * step)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active])
}
