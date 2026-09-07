export type IndicatorShape =
  | { kind: 'none' }
  | {
      kind: 'line'
      axis: 'horizontal' | 'vertical'
      top: number
      left: number
      length: number
      indent: number
    }
  | { kind: 'box'; top: number; left: number; width: number; height: number }

export type IndicatorSurface = 'tree' | 'canvas'

type Listener = (shape: IndicatorShape) => void

const listeners = new Map<IndicatorSurface, Set<Listener>>()
const current = new Map<IndicatorSurface, IndicatorShape>()

const NONE: IndicatorShape = { kind: 'none' }

export function subscribeIndicator(surface: IndicatorSurface, listener: Listener) {
  let set = listeners.get(surface)
  if (!set) {
    set = new Set()
    listeners.set(surface, set)
  }
  set.add(listener)
  listener(current.get(surface) ?? NONE)
  return () => {
    set?.delete(listener)
  }
}

export function setIndicator(surface: IndicatorSurface, shape: IndicatorShape) {
  const previous = current.get(surface) ?? NONE
  if (isSameShape(previous, shape)) return
  current.set(surface, shape)
  const set = listeners.get(surface)
  if (!set) return
  for (const listener of set) listener(shape)
}

export function clearIndicators() {
  for (const surface of listeners.keys()) setIndicator(surface, NONE)
  current.clear()
}

function isSameShape(a: IndicatorShape, b: IndicatorShape): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'none' || b.kind === 'none') return true
  if (a.kind === 'line' && b.kind === 'line') {
    return (
      a.axis === b.axis &&
      a.top === b.top &&
      a.left === b.left &&
      a.length === b.length &&
      a.indent === b.indent
    )
  }
  if (a.kind === 'box' && b.kind === 'box') {
    return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height
  }
  return false
}

let generation = 0

export function beginDragGeneration() {
  generation += 1
}

export function dragGeneration() {
  return generation
}
