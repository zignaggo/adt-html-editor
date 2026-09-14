import type { Box, Size } from '../geometry'

export type Guide = {
  axis: 'vertical' | 'horizontal'
  at: number
  from: number
  to: number
}

type Match = { delta: number; at: number; from: number; to: number; rank: number }

function anchors(start: number, size: number): number[] {
  return [start, start + size / 2, start + size]
}

function bestOnAxis(
  moving: { start: number; size: number; crossStart: number; crossSize: number },
  targets: { start: number; size: number; crossStart: number; crossSize: number }[],
  pageSize: number,
  pageCross: number,
  threshold: number,
): Match | null {
  let best: Match | null = null
  const own = anchors(moving.start, moving.size)

  const consider = (
    ownIndex: number,
    line: number,
    crossStart: number,
    crossSize: number,
  ): boolean => {
    const delta = line - own[ownIndex]
    const distance = Math.abs(delta)
    if (distance > threshold) return false
    const rank = ownIndex === 1 ? 1 : 0
    if (
      best &&
      (distance > Math.abs(best.delta) || (distance === Math.abs(best.delta) && rank >= best.rank))
    ) {
      return false
    }
    const from = Math.min(moving.crossStart, crossStart)
    const to = Math.max(moving.crossStart + moving.crossSize, crossStart + crossSize)
    best = { delta, at: line, from, to, rank }
    return distance === 0 && rank === 0
  }

  for (const target of targets) {
    for (const line of anchors(target.start, target.size)) {
      for (let ownIndex = 0; ownIndex < 3; ownIndex += 1) {
        if (consider(ownIndex, line, target.crossStart, target.crossSize)) return best
      }
    }
  }

  for (const line of anchors(0, pageSize)) {
    for (let ownIndex = 0; ownIndex < 3; ownIndex += 1) {
      if (consider(ownIndex, line, 0, pageCross)) return best
    }
  }

  return best
}

export function snapWithGuides(
  box: Box,
  siblings: Box[],
  page: Size,
  threshold: number,
): { x: number; y: number; guides: Guide[] } {
  if (threshold <= 0) return { x: box.x, y: box.y, guides: [] }

  const horizontalTargets = siblings.map((sibling) => ({
    start: sibling.x,
    size: sibling.width,
    crossStart: sibling.y,
    crossSize: sibling.height,
  }))
  const verticalTargets = siblings.map((sibling) => ({
    start: sibling.y,
    size: sibling.height,
    crossStart: sibling.x,
    crossSize: sibling.width,
  }))

  const xMatch = bestOnAxis(
    { start: box.x, size: box.width, crossStart: box.y, crossSize: box.height },
    horizontalTargets,
    page.width,
    page.height,
    threshold,
  )
  const yMatch = bestOnAxis(
    { start: box.y, size: box.height, crossStart: box.x, crossSize: box.width },
    verticalTargets,
    page.height,
    page.width,
    threshold,
  )

  const x = xMatch ? box.x + xMatch.delta : box.x
  const y = yMatch ? box.y + yMatch.delta : box.y
  const guides: Guide[] = []

  if (xMatch) {
    const from = Math.min(xMatch.from, y)
    const to = Math.max(xMatch.to, y + box.height)
    guides.push({ axis: 'vertical', at: xMatch.at, from, to })
  }
  if (yMatch) {
    const from = Math.min(yMatch.from, x)
    const to = Math.max(yMatch.to, x + box.width)
    guides.push({ axis: 'horizontal', at: yMatch.at, from, to })
  }

  return { x, y, guides }
}
