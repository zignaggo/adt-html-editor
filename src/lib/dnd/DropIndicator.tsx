import { useEffect, useRef } from 'react'
import {
  INDICATOR_THICKNESS,
  subscribeIndicator,
  type IndicatorShape,
  type IndicatorSurface,
} from './dragStore'

const clipClass = 'pointer-events-none fixed top-0 left-0 z-40 overflow-hidden'

const indicatorClass =
  'pointer-events-none absolute top-0 left-0 rounded-full bg-primary will-change-transform ' +
  'transition-opacity duration-100 ease-out data-[shape=none]:opacity-0 ' +
  'before:absolute before:hidden before:size-1.5 before:rounded-full before:bg-primary ' +
  'before:shadow-[0_0_0_1.5px_var(--color-background)] ' +
  'data-[shape=line-horizontal]:opacity-100 data-[shape=line-vertical]:opacity-100 ' +
  'data-[shape=line-horizontal]:shadow-[0_0_0_1px_var(--color-background)] ' +
  'data-[shape=line-vertical]:shadow-[0_0_0_1px_var(--color-background)] ' +
  'data-[shape=line-horizontal]:before:block data-[shape=line-horizontal]:before:top-1/2 ' +
  'data-[shape=line-horizontal]:before:-left-[3px] data-[shape=line-horizontal]:before:-translate-y-1/2 ' +
  'data-[shape=line-vertical]:before:block data-[shape=line-vertical]:before:left-1/2 ' +
  'data-[shape=line-vertical]:before:-top-[3px] data-[shape=line-vertical]:before:-translate-x-1/2 ' +
  'data-[shape=box]:rounded-sm data-[shape=box]:bg-primary/12 data-[shape=box]:opacity-100 ' +
  'data-[shape=box]:shadow-[inset_0_0_0_2px_var(--color-primary)]'

type Origin = { x: number; y: number }

const VIEWPORT_ORIGIN: Origin = { x: 0, y: 0 }

export function DropIndicator({ surface }: { surface: IndicatorSurface }) {
  const clipRef = useRef<HTMLDivElement | null>(null)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return subscribeIndicator(surface, (shape) => {
      const element = ref.current
      const clip = clipRef.current
      if (!element || !clip) return
      applyShape(element, shape, placeClip(clip))
    })
  }, [surface])

  return (
    <div ref={clipRef} className={clipClass} aria-hidden="true">
      <div ref={ref} className={indicatorClass} data-shape="none" />
    </div>
  )
}

function placeClip(clip: HTMLDivElement): Origin {
  const viewport = clip.closest('[data-adt-canvas-scroll]')
  if (!viewport) {
    clip.style.transform = ''
    clip.style.width = '100vw'
    clip.style.height = '100vh'
    return VIEWPORT_ORIGIN
  }

  const rect = viewport.getBoundingClientRect()
  clip.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`
  clip.style.width = `${rect.width}px`
  clip.style.height = `${rect.height}px`
  return { x: rect.left, y: rect.top }
}

function applyShape(element: HTMLDivElement, shape: IndicatorShape, origin: Origin) {
  if (shape.kind === 'none') {
    element.dataset.shape = 'none'
    return
  }

  const left = shape.left - origin.x
  const top = shape.top - origin.y

  if (shape.kind === 'box') {
    element.dataset.shape = 'box'
    element.style.transform = `translate3d(${left}px, ${top}px, 0)`
    element.style.width = `${shape.width}px`
    element.style.height = `${shape.height}px`
    return
  }

  element.dataset.shape = shape.axis === 'horizontal' ? 'line-horizontal' : 'line-vertical'
  element.style.transform = `translate3d(${left}px, ${top}px, 0)`
  if (shape.axis === 'horizontal') {
    element.style.width = `${shape.length}px`
    element.style.height = `${INDICATOR_THICKNESS}px`
  } else {
    element.style.width = `${INDICATOR_THICKNESS}px`
    element.style.height = `${shape.length}px`
  }
}
