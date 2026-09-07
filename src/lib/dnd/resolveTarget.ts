import type { RefObject } from 'react'

export type DragTargetRef = RefObject<HTMLElement | null> | HTMLElement | null

export function resolveTarget(target: DragTargetRef): HTMLElement | null {
  if (!target) return null
  if (target instanceof HTMLElement) return target
  return target.current
}
