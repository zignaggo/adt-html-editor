import type { DropTargetRecord, Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item'
import { isCanvasTarget, isTreeTarget, type DragSurface } from './data'
import { computeInsideSpot, extractCanvasZone } from './canvasHitbox'
import type { IndicatorShape } from './dragStore'
import { shapeForInstruction } from './useTreeDropTarget'

export type SurfaceIndicator = { surface: DragSurface; shape: IndicatorShape }

export function indicatorFor(
  target: DropTargetRecord | undefined,
  input: Input,
): SurfaceIndicator | null {
  if (!target) return null

  if (isTreeTarget(target.data)) {
    return {
      surface: 'tree',
      shape: shapeForInstruction(
        target.element.getBoundingClientRect(),
        extractInstruction(target.data),
      ),
    }
  }

  if (isCanvasTarget(target.data)) {
    return { surface: 'canvas', shape: canvasShape(target, input) }
  }

  return null
}

function canvasShape(target: DropTargetRecord, input: Input): IndicatorShape {
  const zone = extractCanvasZone(target.data)
  if (!zone) return { kind: 'none' }
  const rect = target.element.getBoundingClientRect()

  if (zone.type === 'edge') {
    if (zone.edge === 'top' || zone.edge === 'bottom') {
      return {
        kind: 'line',
        axis: 'horizontal',
        top: zone.edge === 'top' ? rect.top : rect.bottom,
        left: rect.left,
        length: rect.width,
        indent: 0,
      }
    }
    return {
      kind: 'line',
      axis: 'vertical',
      top: rect.top,
      left: zone.edge === 'left' ? rect.left : rect.right,
      length: rect.height,
      indent: 0,
    }
  }

  if (!isCanvasTarget(target.data)) return { kind: 'none' }
  const spot = computeInsideSpot(target.element, input, target.data.nestAxis)

  if (!spot.line) {
    return { kind: 'box', top: rect.top, left: rect.left, width: rect.width, height: rect.height }
  }

  return spot.line.axis === 'horizontal'
    ? {
        kind: 'line',
        axis: 'horizontal',
        top: spot.line.cross,
        left: spot.line.start,
        length: spot.line.length,
        indent: 0,
      }
    : {
        kind: 'line',
        axis: 'vertical',
        top: spot.line.start,
        left: spot.line.cross,
        length: spot.line.length,
        indent: 0,
      }
}
