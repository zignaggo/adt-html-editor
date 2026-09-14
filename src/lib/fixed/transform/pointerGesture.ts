import type { GestureController, GestureInput } from './gesture'

const MODIFIERS = new Set(['Shift', 'Alt'])

function inputOf(event: PointerEvent | GestureInput, modifiers?: KeyboardEvent): GestureInput {
  return {
    clientX: event.clientX,
    clientY: event.clientY,
    shiftKey: modifiers ? modifiers.shiftKey : event.shiftKey,
    altKey: modifiers ? modifiers.altKey : event.altKey,
  }
}

export function runPointerGesture(event: PointerEvent, controller: GestureController) {
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
}
