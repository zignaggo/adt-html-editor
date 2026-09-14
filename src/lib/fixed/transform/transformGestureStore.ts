import type { NodeId } from '../../core/ids'
import type { Box } from '../geometry'
import type { Guide } from '../guides/computeGuides'
import { createSessionStore } from '../sessionStore'
import type { HandleId } from './handleSpecs'

export type TransformGesture = {
  kind: 'resize' | 'rotate'
  nodeId: NodeId
  handle: HandleId | null
  box: Box
  angle: number
  guides: Guide[]
}

const store = createSessionStore<TransformGesture>()

export const transformGesture = store.current
export const subscribeTransformGesture = store.subscribe
export const beginTransformGesture = store.begin
export const updateTransformGesture = store.update
export const endTransformGesture = store.end
