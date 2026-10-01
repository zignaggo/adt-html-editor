type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeCanvasViewport(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifyCanvasViewport(): void {
  for (const listener of listeners) listener()
}
