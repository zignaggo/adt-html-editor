import { useEffect, useRef } from 'react'
import {
  INDICATOR_THICKNESS,
  subscribeIndicator,
  type IndicatorShape,
  type IndicatorSurface,
} from './dragStore'

const indicatorClass =
  'pointer-events-none fixed top-0 left-0 z-40 rounded-full bg-primary will-change-transform ' +
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

export function DropIndicator({ surface }: { surface: IndicatorSurface }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return subscribeIndicator(surface, (shape) => {
      const element = ref.current
      if (!element) return
      applyShape(element, shape)
    })
  }, [surface])

  return <div ref={ref} className={indicatorClass} data-shape="none" aria-hidden="true" />
}

function applyShape(element: HTMLDivElement, shape: IndicatorShape) {
  if (shape.kind === 'none') {
    element.dataset.shape = 'none'
    return
  }

  if (shape.kind === 'box') {
    element.dataset.shape = 'box'
    element.style.transform = `translate3d(${shape.left}px, ${shape.top}px, 0)`
    element.style.width = `${shape.width}px`
    element.style.height = `${shape.height}px`
    return
  }

  element.dataset.shape = shape.axis === 'horizontal' ? 'line-horizontal' : 'line-vertical'
  element.style.transform = `translate3d(${shape.left}px, ${shape.top}px, 0)`
  if (shape.axis === 'horizontal') {
    element.style.width = `${shape.length}px`
    element.style.height = `${INDICATOR_THICKNESS}px`
  } else {
    element.style.width = `${INDICATOR_THICKNESS}px`
    element.style.height = `${shape.length}px`
  }
}
