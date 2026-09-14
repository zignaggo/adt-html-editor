import type { NodeId } from '../core/ids'
import type { NodeTemplate } from '../core/store'
import type { Box, Point, Size } from './geometry'
import type { Guide } from './guides/computeGuides'
import { createSessionStore } from './sessionStore'

export type FixedDragSession = {
  nodeId: NodeId | null
  template: NodeTemplate | null
  sourceElement: HTMLElement | null
  origin: Box
  grab: Point
  size: Size
  siblings: Box[]
  position: Point
  guides: Guide[]
}

const store = createSessionStore<FixedDragSession>()

export const fixedDragSession = store.current
export const subscribeFixedDrag = store.subscribe
export const beginFixedSession = store.begin
export const endFixedSession = store.end

export function updateFixedSession(position: Point, guides: Guide[]) {
  store.update({ position, guides })
}
