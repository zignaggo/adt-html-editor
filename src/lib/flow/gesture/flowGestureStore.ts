import { createSessionStore, type SessionStore } from '../../fixed/sessionStore'

export type FlowGestureKind = 'move' | 'resize' | 'space'

export type FlowGestureSession = {
  kind: FlowGestureKind
  axis: 'x' | 'y' | null
  guideTop: number | null
  feedback: string
}

const store: SessionStore<FlowGestureSession> = createSessionStore<FlowGestureSession>()

export const flowGesture = store

export function subscribeFlowGesture(
  listener: (session: FlowGestureSession | null) => void,
): () => void {
  return store.subscribe(listener)
}
