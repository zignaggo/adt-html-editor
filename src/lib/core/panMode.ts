type Listener = (active: boolean) => void

const listeners = new Set<Listener>()

let active = false
let keyHeld = false
let pointerHeld = false
let trackers = 0

export function isPanModifier(event: { ctrlKey: boolean; metaKey: boolean }): boolean {
  return event.ctrlKey || event.metaKey
}

export function panModeActive(): boolean {
  return active
}

export function subscribePanMode(listener: Listener): () => void {
  listeners.add(listener)
  listener(active)
  return () => {
    listeners.delete(listener)
  }
}

function sync() {
  const next = keyHeld || pointerHeld
  if (active === next) return
  active = next
  for (const listener of listeners) listener(active)
}

export function setPointerPan(held: boolean): void {
  pointerHeld = held
  sync()
}

function onKey(event: KeyboardEvent) {
  keyHeld = isPanModifier(event)
  sync()
}

function onRelease() {
  keyHeld = false
  sync()
}

export function trackPanMode(): () => void {
  trackers += 1
  if (trackers === 1) {
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('blur', onRelease)
    document.addEventListener('visibilitychange', onRelease)
  }

  return () => {
    trackers -= 1
    if (trackers > 0) return
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('keyup', onKey)
    window.removeEventListener('blur', onRelease)
    document.removeEventListener('visibilitychange', onRelease)
    keyHeld = false
    pointerHeld = false
    sync()
  }
}
