import { useRef } from 'react'
import { useCanvasHost, type CanvasHost } from '../components/Canvas/useCanvasHost'
import {
  useDirectControls,
  useEditorSelector,
  useEffectiveLock,
  useRootId,
} from '../components/Editor/context'
import type { NodeId } from '../core/ids'
import { useMeasured } from '../fixed/useMeasured'
import { inspectFlow, orderElementOf, type FlowFlags, type FlowInspection } from './capabilities'
import { GESTURE_ATTRIBUTE } from './gesture/canvasGesture'

const NO_ID = '' as NodeId

export type FlowBox = {
  left: number
  top: number
  width: number
  height: number
}

export type FlowGeometry = {
  box: FlowBox
  parentBox: FlowBox | null
  contentWidth: number
  hostLeft: number
  hostTop: number
  hostWidth: number
  hostHeight: number
  scale: number
}

export type FlowTarget = {
  id: NodeId
  element: HTMLElement
  orderElement: HTMLElement
  inspection: FlowInspection
  host: CanvasHost
  measure: () => FlowGeometry | null
}

type Measured = {
  element: HTMLElement
  inspection: FlowInspection
}

function sameFlags(a: FlowFlags, b: FlowFlags): boolean {
  let key: keyof FlowFlags
  for (key in a) {
    if (a[key] !== b[key]) return false
  }
  return true
}

function boxOf(element: Element, hostRect: DOMRect): FlowBox {
  const rect = element.getBoundingClientRect()
  return {
    left: rect.left - hostRect.left,
    top: rect.top - hostRect.top,
    width: rect.width,
    height: rect.height,
  }
}

export function contentWidthOf(element: HTMLElement): number {
  const style = getComputedStyle(element)
  const padding = Number.parseFloat(style.paddingLeft || '0') + Number.parseFloat(style.paddingRight || '0')
  return Math.max(0, element.clientWidth - padding)
}

/**
 * The element the direct controls act on: exactly one selection, no text being edited,
 * not the root, and nothing locked above it.
 */
export function useFlowSelection(): FlowTarget | null {
  const direct = useDirectControls()
  const rootId = useRootId()
  const selectedId = useEditorSelector((state) =>
    state.selectedIds.length === 1 && state.editingTextId === null ? state.selectedIds[0] : null,
  )
  const locked = useEffectiveLock(selectedId ?? NO_ID)
  const host = useCanvasHost()
  const lastRef = useRef<Measured | null>(null)

  const id = direct && selectedId !== null && selectedId !== rootId && !locked ? selectedId : NO_ID

  const measured = useMeasured<Measured>(
    id,
    (element) => {
      const previous = lastRef.current
      if (previous?.element === element && element.hasAttribute(GESTURE_ATTRIBUTE)) return previous
      const next: Measured = { element, inspection: inspectFlow(element) }
      lastRef.current = next
      return next
    },
    (a, b) => a.element === b.element && sameFlags(a.inspection.flags, b.inspection.flags),
  )

  if (id === NO_ID || !measured) return null
  const { element, inspection } = measured

  return {
    id,
    element,
    orderElement: orderElementOf(element),
    inspection,
    host,
    measure: () => {
      const hostElement = host.host()
      if (!hostElement || !element.isConnected) return null
      const hostRect = hostElement.getBoundingClientRect()
      const parent = element.parentElement
      return {
        box: boxOf(element, hostRect),
        parentBox: parent ? boxOf(parent, hostRect) : null,
        contentWidth: parent ? contentWidthOf(parent) : 0,
        hostLeft: hostRect.left,
        hostTop: hostRect.top,
        hostWidth: hostRect.width,
        hostHeight: hostRect.height,
        scale: host.scale(),
      }
    },
  }
}
