import { useEffect, useRef } from 'react'
import { useFixedLayout } from '../../components/Editor/context'
import { subscribeFixedDrag } from '../fixedDragStore'
import { subscribeTransformGesture } from '../transform/transformGestureStore'
import type { Guide } from './computeGuides'
import styles from './Guides.module.css'

const SVG_NS = 'http://www.w3.org/2000/svg'

function renderGuides(svg: SVGSVGElement, guides: Guide[]) {
  svg.replaceChildren()
  for (const guide of guides) {
    const line = document.createElementNS(SVG_NS, 'line')
    if (guide.axis === 'vertical') {
      line.setAttribute('x1', String(guide.at))
      line.setAttribute('x2', String(guide.at))
      line.setAttribute('y1', String(guide.from))
      line.setAttribute('y2', String(guide.to))
    } else {
      line.setAttribute('y1', String(guide.at))
      line.setAttribute('y2', String(guide.at))
      line.setAttribute('x1', String(guide.from))
      line.setAttribute('x2', String(guide.to))
    }
    line.setAttribute('vector-effect', 'non-scaling-stroke')
    svg.appendChild(line)
  }
}

export function Guides() {
  const { page } = useFixedLayout()
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const unsubscribeDrag = subscribeFixedDrag((session) => {
      if (ref.current) renderGuides(ref.current, session?.guides ?? [])
    })
    const unsubscribeGesture = subscribeTransformGesture((gesture) => {
      if (ref.current) renderGuides(ref.current, gesture?.guides ?? [])
    })
    return () => {
      unsubscribeDrag()
      unsubscribeGesture()
    }
  }, [])

  return (
    <svg
      ref={ref}
      className={styles.guides}
      width={page.width}
      height={page.height}
      viewBox={`0 0 ${page.width} ${page.height}`}
      aria-hidden="true"
    />
  )
}
