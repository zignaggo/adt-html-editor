import { useEffect, useRef } from 'react'
import { subscribeTransformGesture, type TransformGesture } from './transformGestureStore'

function badgeText(gesture: TransformGesture): string {
  if (gesture.kind === 'rotate') return `${gesture.angle}°`
  return `${Math.round(gesture.box.width)} × ${Math.round(gesture.box.height)}`
}

export function GestureBadge({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    return subscribeTransformGesture((gesture) => {
      const badge = ref.current
      if (!badge) return
      badge.dataset.visible = gesture ? 'true' : 'false'
      badge.textContent = gesture ? badgeText(gesture) : ''
    })
  }, [])

  return <span ref={ref} className={className} data-visible="false" role="status" aria-live="polite" />
}
