import type { Box, Point, Size } from '../geometry'
import type { Guide } from '../guides/computeGuides'
import { anchorFractionOf, isCorner, movesX, movesY, type HandleId } from './handleSpecs'
import { rotatePoint } from './rotation'

export type ResizeArgs = {
  box: Box
  angle: number
  origin: Point
  handle: HandleId
  delta: Point
  keepRatio: boolean
  fromCenter: boolean
  min: number | Size
}

function minOf(min: number | Size, axis: 'width' | 'height'): number {
  return typeof min === 'number' ? min : min[axis]
}

export function pointOnBox(box: Box, angle: number, origin: Point, fraction: Point): Point {
  const pivot = { x: box.x + origin.x * box.width, y: box.y + origin.y * box.height }
  const offset = rotatePoint(
    { x: (fraction.x - origin.x) * box.width, y: (fraction.y - origin.y) * box.height },
    angle,
  )
  return { x: pivot.x + offset.x, y: pivot.y + offset.y }
}

function constrainRatio(handle: HandleId, box: Size, width: number, height: number): Size {
  if (box.width <= 0 || box.height <= 0) return { width, height }
  const ratio = box.width / box.height
  const widthChange = Math.abs(width / box.width - 1)
  const heightChange = Math.abs(height / box.height - 1)
  const followWidth = !movesY(handle) || (isCorner(handle) && widthChange >= heightChange)
  return followWidth ? { width, height: width / ratio } : { width: height * ratio, height }
}

export function resizeBox(args: ResizeArgs): Box {
  const { box, angle, origin, handle, keepRatio, fromCenter, min } = args
  const local = rotatePoint(args.delta, -angle)
  const factor = fromCenter ? 2 : 1
  let width = box.width
  let height = box.height
  if (handle.includes('e')) width += local.x * factor
  if (handle.includes('w')) width -= local.x * factor
  if (handle.includes('s')) height += local.y * factor
  if (handle.includes('n')) height -= local.y * factor
  if (keepRatio) ({ width, height } = constrainRatio(handle, box, width, height))
  width = Math.max(minOf(min, 'width'), width)
  height = Math.max(minOf(min, 'height'), height)

  const anchor = anchorFractionOf(handle, fromCenter)
  const fixed = pointOnBox(box, angle, origin, anchor)
  const offset = rotatePoint(
    { x: (anchor.x - origin.x) * width, y: (anchor.y - origin.y) * height },
    angle,
  )
  const pivot = { x: fixed.x - offset.x, y: fixed.y - offset.y }
  return { x: pivot.x - origin.x * width, y: pivot.y - origin.y * height, width, height }
}

type Candidate = { at: number; crossStart: number; crossSize: number }

function candidatesOn(
  siblings: Box[],
  page: Size,
  axis: 'x' | 'y',
): Candidate[] {
  const out: Candidate[] = []
  for (const sibling of siblings) {
    const start = axis === 'x' ? sibling.x : sibling.y
    const size = axis === 'x' ? sibling.width : sibling.height
    const crossStart = axis === 'x' ? sibling.y : sibling.x
    const crossSize = axis === 'x' ? sibling.height : sibling.width
    out.push(
      { at: start, crossStart, crossSize },
      { at: start + size / 2, crossStart, crossSize },
      { at: start + size, crossStart, crossSize },
    )
  }
  const pageSize = axis === 'x' ? page.width : page.height
  const pageCross = axis === 'x' ? page.height : page.width
  out.push(
    { at: 0, crossStart: 0, crossSize: pageCross },
    { at: pageSize / 2, crossStart: 0, crossSize: pageCross },
    { at: pageSize, crossStart: 0, crossSize: pageCross },
  )
  return out
}

function closest(edge: number, candidates: Candidate[], threshold: number): Candidate | null {
  let best: Candidate | null = null
  let bestDistance = threshold
  for (const candidate of candidates) {
    const distance = Math.abs(candidate.at - edge)
    if (distance <= bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

export function snapResizeEdges(
  box: Box,
  handle: HandleId,
  siblings: Box[],
  page: Size,
  threshold: number,
  min: number | Size = 1,
): { box: Box; guides: Guide[] } {
  if (threshold <= 0) return { box, guides: [] }
  const next = { ...box }
  const guides: Guide[] = []

  if (movesX(handle)) {
    const east = handle.includes('e')
    const edge = east ? box.x + box.width : box.x
    const match = closest(edge, candidatesOn(siblings, page, 'x'), threshold)
    if (match) {
      const delta = match.at - edge
      const width = east ? box.width + delta : box.width - delta
      if (width >= minOf(min, 'width')) {
        next.width = width
        if (!east) next.x = box.x + delta
        guides.push({
          axis: 'vertical',
          at: match.at,
          from: Math.min(box.y, match.crossStart),
          to: Math.max(box.y + box.height, match.crossStart + match.crossSize),
        })
      }
    }
  }

  if (movesY(handle)) {
    const south = handle.includes('s')
    const edge = south ? box.y + box.height : box.y
    const match = closest(edge, candidatesOn(siblings, page, 'y'), threshold)
    if (match) {
      const delta = match.at - edge
      const height = south ? box.height + delta : box.height - delta
      if (height >= minOf(min, 'height')) {
        next.height = height
        if (!south) next.y = box.y + delta
        guides.push({
          axis: 'horizontal',
          at: match.at,
          from: Math.min(next.x, match.crossStart),
          to: Math.max(next.x + next.width, match.crossStart + match.crossSize),
        })
      }
    }
  }

  return { box: next, guides }
}
