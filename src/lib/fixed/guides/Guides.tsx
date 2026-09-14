import { useEffect, useRef } from 'react'
import { useFixedLayout } from '../../components/Editor/context'
import { subscribeFixedDrag } from '../fixedDragStore'
import styles from './Guides.module.css'

const SVG_NS = 'http://www.w3.org/2000/svg'

export function Guides() {
  const { page } = useFixedLayout()
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    return subscribeFixedDrag((session) => {
      const svg = ref.current
      if (!svg) return
      svg.replaceChildren()
      if (!session) return
      for (const guide of session.guides) {
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
    })
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
