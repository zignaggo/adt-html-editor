import {
  gestureInputOf,
  runPointerGesture,
  swallowNextClick,
  type GestureController,
  type GestureInput,
} from '../../core/pointerGesture'
import { whenStylesheetSettled } from '../../tailwind/stylesheetStore'

export const GESTURE_ATTRIBUTE = 'data-adt-flow-gesture'

export const MOVE_ATTRIBUTE = 'data-adt-flow-move'

export type CanvasGestureSession<TState> = {
  state: TState
  element: HTMLElement
  origin: GestureInput
}

export type CanvasGestureCommit = {
  style?: string | null
}

export type CanvasGestureSpec<TState> = {
  element: HTMLElement
  threshold?: number
  begin: (input: GestureInput) => TState | null
  preview: (session: CanvasGestureSession<TState>, input: GestureInput) => void
  commit: (session: CanvasGestureSession<TState>, input: GestureInput) => CanvasGestureCommit | void
  onEnd?: (session: CanvasGestureSession<TState>, committed: boolean) => void
}

const DEFAULT_THRESHOLD = 3

function travelled(origin: GestureInput, input: GestureInput): number {
  return Math.hypot(input.clientX - origin.clientX, input.clientY - origin.clientY)
}

/**
 * The gesture cycle the direct controls share: preview on the DOM, one commit on release,
 * and the inline preview held until the stylesheet covers the classes just written.
 * Returns an abort handle for what the window cannot see — unmount, lock or document change.
 */
export function beginCanvasGesture<TState>(
  event: PointerEvent,
  spec: CanvasGestureSpec<TState>,
): (() => void) | null {
  const origin = gestureInputOf(event)
  const state = spec.begin(origin)
  if (state === null) return null

  const { element } = spec
  const session: CanvasGestureSession<TState> = { state, element, origin }
  const snapshot = element.getAttribute('style')
  const threshold = spec.threshold ?? DEFAULT_THRESHOLD
  const page = element.ownerDocument
  let last = origin
  let engaged = false

  const refuseSelection = (selection: Event) => selection.preventDefault()
  page.addEventListener('selectstart', refuseSelection)

  const applyStyle = (style: string | null) => {
    if (style === null) element.removeAttribute('style')
    else element.setAttribute('style', style)
  }

  const teardown = (committed: boolean) => {
    page.removeEventListener('selectstart', refuseSelection)
    element.removeAttribute(GESTURE_ATTRIBUTE)
    spec.onEnd?.(session, committed)
  }

  const controller: GestureController = {
    move(input) {
      last = input
      if (!engaged) {
        if (travelled(origin, input) < threshold) return
        engaged = true
        page.getSelection()?.removeAllRanges()
        element.setAttribute(GESTURE_ATTRIBUTE, '')
      }
      spec.preview(session, input)
    },

    finish() {
      if (!engaged) {
        teardown(false)
        return
      }
      swallowNextClick()
      const result = spec.commit(session, last) ?? {}
      const resting = result.style === undefined ? snapshot : result.style
      teardown(true)
      void whenStylesheetSettled().then(() => applyStyle(resting))
    },

    cancel() {
      applyStyle(snapshot)
      teardown(false)
    },
  }

  return runPointerGesture(event, controller)
}
