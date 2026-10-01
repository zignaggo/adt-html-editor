import { useEffect, useRef, type RefObject } from 'react'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import type { DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types'
import { useControls } from 'react-zoom-pan-pinch'
import { isEditorDrag } from '../../dnd/data'

const EDGE_BAND = 56
const MAX_SPEED = 16

export function useCanvasAutoPan(stageRef: RefObject<HTMLElement | null>) {
  const controls = useControls()
  const controlsRef = useRef(controls)

  useEffect(() => {
    controlsRef.current = controls
  })

  useEffect(() => {
    let frame = 0
    let pointer: { x: number; y: number } | null = null

    const step = () => {
      const stage = stageRef.current
      if (!pointer || !stage) {
        frame = 0
        return
      }

      const rect = stage.getBoundingClientRect()
      const x = speedAlong(pointer.x, rect.left, rect.right)
      const y = speedAlong(pointer.y, rect.top, rect.bottom)
      if (x !== 0 || y !== 0) controlsRef.current.panBy(-x, -y, 0)

      frame = requestAnimationFrame(step)
    }

    const track = (location: DragLocationHistory) => {
      pointer = { x: location.current.input.clientX, y: location.current.input.clientY }
      if (!frame) frame = requestAnimationFrame(step)
    }

    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
      pointer = null
    }

    return monitorForElements({
      canMonitor: ({ source }) => isEditorDrag(source.data),
      onDragStart: ({ location }) => track(location),
      onDrag: ({ location }) => track(location),
      onDrop: stop,
    })
  }, [stageRef])
}

function speedAlong(value: number, start: number, end: number): number {
  if (end - start < EDGE_BAND * 2) return 0
  if (value < start + EDGE_BAND) return -ramp(start + EDGE_BAND - value)
  if (value > end - EDGE_BAND) return ramp(value - (end - EDGE_BAND))
  return 0
}

function ramp(distance: number): number {
  return MAX_SPEED * Math.min(1, distance / EDGE_BAND)
}
