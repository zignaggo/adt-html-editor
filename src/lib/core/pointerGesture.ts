export type GestureInput = {
  clientX: number
  clientY: number
  shiftKey: boolean
  altKey: boolean
}

export type GestureController = {
  move: (input: GestureInput) => void
  finish: () => void
  cancel: () => void
}

const MODIFIERS = new Set(['Shift', 'Alt'])

export function gestureInputOf(event: PointerEvent | GestureInput): GestureInput {
  return inputOf(event)
}

function inputOf(event: PointerEvent | GestureInput, modifiers?: KeyboardEvent): GestureInput {
  return {
    clientX: event.clientX,
    clientY: event.clientY,
    shiftKey: modifiers ? modifiers.shiftKey : event.shiftKey,
    altKey: modifiers ? modifiers.altKey : event.altKey,
  }
}

function isHistoryKey(event: KeyboardEvent): boolean {
  if (!event.ctrlKey && !event.metaKey) return false
  const key = event.key.toLowerCase()
  return key === 'z' || key === 'y'
}

/** Keeps the click that follows a drag from re-selecting or activating what was dragged. */
export function swallowNextClick(): void {
  const onClick = (click: MouseEvent) => {
    click.preventDefault()
    click.stopPropagation()
  }
  window.addEventListener('click', onClick, { capture: true, once: true })
  requestAnimationFrame(() => {
    window.removeEventListener('click', onClick, { capture: true })
  })
}

/**
 * Runs a pointer gesture to completion. Returns an abort handle for the cases the window
 * cannot see — unmount, a lock change, a new document.
 */
export function runPointerGesture(
  event: PointerEvent,
  controller: GestureController,
): () => void {
  const { pointerId } = event
  let last = inputOf(event)
  let active = true

  const stop = () => {
    active = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('keyup', onKey, true)
    window.removeEventListener('blur', onCancel)
  }

  const onMove = (move: PointerEvent) => {
    if (move.pointerId !== pointerId) return
    last = inputOf(move)
    controller.move(last)
  }

  const onUp = (up: PointerEvent) => {
    if (up.pointerId !== pointerId) return
    stop()
    controller.finish()
  }

  const onCancel = () => {
    if (!active) return
    stop()
    controller.cancel()
  }

  const onKey = (key: KeyboardEvent) => {
    if (key.key === 'Escape') {
      key.preventDefault()
      key.stopPropagation()
      onCancel()
      return
    }
    if (isHistoryKey(key)) {
      onCancel()
      return
    }
    if (!MODIFIERS.has(key.key)) return
    last = inputOf(last, key)
    controller.move(last)
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('keyup', onKey, true)
  window.addEventListener('blur', onCancel)

  return onCancel
}
