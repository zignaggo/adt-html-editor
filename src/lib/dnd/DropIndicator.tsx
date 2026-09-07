import { useEffect, useRef } from 'react'
import { subscribeIndicator, type IndicatorShape, type IndicatorSurface } from './dragStore'
import styles from './DropIndicator.module.css'

export function DropIndicator({ surface }: { surface: IndicatorSurface }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return subscribeIndicator(surface, (shape) => {
      const element = ref.current
      if (!element) return
      applyShape(element, shape)
    })
  }, [surface])

  return <div ref={ref} className={styles.indicator} data-shape="none" aria-hidden="true" />
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
    element.style.height = '2px'
  } else {
    element.style.width = '2px'
    element.style.height = `${shape.length}px`
  }
}
