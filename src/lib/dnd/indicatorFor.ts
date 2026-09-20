import type { DropTargetRecord, Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item'
import { isCanvasTarget, isTreeTarget, type DragSurface } from './data'
import { computeEdgeLine, computeInsideSpot, extractCanvasZone, type SpotLine } from './canvasHitbox'
import { INDICATOR_THICKNESS, type IndicatorShape } from './dragStore'
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
  if (!isCanvasTarget(target.data)) return { kind: 'none' }
  const zone = extractCanvasZone(target.data)
  if (!zone) return { kind: 'none' }

  if (zone.type === 'edge') {
    return shapeForLine(computeEdgeLine(target.element, zone.edge))
  }

  const spot = computeInsideSpot(target.element, input, target.data.nestAxis)
  if (spot.line) return shapeForLine(spot.line)

  const rect = target.element.getBoundingClientRect()
  return { kind: 'box', top: rect.top, left: rect.left, width: rect.width, height: rect.height }
}

function shapeForLine(line: SpotLine | null): IndicatorShape {
  if (!line) return { kind: 'none' }
  const centered = line.cross - INDICATOR_THICKNESS / 2

  return line.axis === 'horizontal'
    ? {
        kind: 'line',
        axis: 'horizontal',
        top: centered,
        left: line.start,
        length: line.length,
        indent: 0,
      }
    : {
        kind: 'line',
        axis: 'vertical',
        top: line.start,
        left: centered,
        length: line.length,
        indent: 0,
      }
}
