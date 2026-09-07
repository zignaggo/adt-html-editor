import type { NodeId } from './ids'

type Listener = (id: NodeId | null) => void

const listeners = new Set<Listener>()
let hovered: NodeId | null = null

export function setHovered(id: NodeId | null) {
  if (hovered === id) return
  hovered = id
  for (const listener of listeners) listener(hovered)
}

export function getHovered(): NodeId | null {
  return hovered
}

export function subscribeHovered(listener: Listener) {
  listeners.add(listener)
  listener(hovered)
  return () => {
    listeners.delete(listener)
  }
}
