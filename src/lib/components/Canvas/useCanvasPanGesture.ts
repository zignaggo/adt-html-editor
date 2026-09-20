import { useEffect, useRef, type RefObject } from 'react'
import { useControls } from 'react-zoom-pan-pinch'
import { panModeActive, subscribePanMode, trackPanMode } from '../../core/panMode'

const PAN_ATTRIBUTE = 'data-adt-pan'

export function useCanvasPanGesture(stageRef: RefObject<HTMLElement | null>) {
  const controls = useControls()
  const controlsRef = useRef(controls)

  useEffect(() => {
    controlsRef.current = controls
  })

  useEffect(() => {
    const element = stageRef.current
    if (!element) return

    let pointerId: number | null = null
    let last = { x: 0, y: 0 }

    const mark = (value: 'active' | 'panning' | null) => {
      if (value) element.setAttribute(PAN_ATTRIBUTE, value)
      else element.removeAttribute(PAN_ATTRIBUTE)
    }

    const release = () => {
      if (pointerId === null) return
      pointerId = null
      mark(panModeActive() ? 'active' : null)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (pointerId !== null || event.button !== 0 || !panModeActive()) return
      pointerId = event.pointerId
      last = { x: event.clientX, y: event.clientY }
      mark('panning')
      event.preventDefault()
      event.stopPropagation()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      controlsRef.current.panBy(event.clientX - last.x, event.clientY - last.y, 0)
      last = { x: event.clientX, y: event.clientY }
    }

    const stopTracking = trackPanMode()
    const unsubscribe = subscribePanMode((isActive) => {
      if (pointerId !== null) return
      mark(isActive ? 'active' : null)
    })

    element.addEventListener('pointerdown', onPointerDown, { capture: true })
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)

    return () => {
      release()
      unsubscribe()
      stopTracking()
      mark(null)
      element.removeEventListener('pointerdown', onPointerDown, { capture: true })
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
    }
  }, [stageRef])
}
