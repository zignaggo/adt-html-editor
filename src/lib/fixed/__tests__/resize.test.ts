import { describe, expect, it } from 'vitest'
import type { Box } from '../geometry'
import { HANDLE_SPECS, anchorFractionOf, type HandleId } from '../transform/handleSpecs'
import { pointOnBox, resizeBox, snapResizeEdges } from '../transform/resize'

const box: Box = { x: 100, y: 200, width: 300, height: 120 }
const center = { x: 0.5, y: 0.5 }
const handles = HANDLE_SPECS.map((spec) => spec.id)

function expectPoint(actual: { x: number; y: number }, expected: { x: number; y: number }) {
  expect(actual.x).toBeCloseTo(expected.x, 2)
  expect(actual.y).toBeCloseTo(expected.y, 2)
}

function resize(handle: HandleId, angle: number, delta: { x: number; y: number }, extra = {}) {
  return resizeBox({
    box,
    angle,
    origin: center,
    handle,
    delta,
    keepRatio: false,
    fromCenter: false,
    min: 1,
    ...extra,
  })
}

describe('resizeBox at 0°', () => {
  it('grows from the south-east corner without moving the origin', () => {
    expect(resize('se', 0, { x: 40, y: -20 })).toEqual({ x: 100, y: 200, width: 340, height: 100 })
  })

  it('moves the box when dragging the north-west corner', () => {
    expect(resize('nw', 0, { x: 10, y: 10 })).toEqual({ x: 110, y: 210, width: 290, height: 110 })
  })

  it('changes a single axis from edge handles', () => {
    expect(resize('e', 0, { x: 25, y: 99 })).toEqual({ x: 100, y: 200, width: 325, height: 120 })
    expect(resize('n', 0, { x: 99, y: -30 })).toEqual({ x: 100, y: 170, width: 300, height: 150 })
    expect(resize('w', 0, { x: -50, y: 0 })).toEqual({ x: 50, y: 200, width: 350, height: 120 })
    expect(resize('s', 0, { x: 0, y: 12 })).toEqual({ x: 100, y: 200, width: 300, height: 132 })
  })

  it('keeps the ratio following the dominant axis on corners', () => {
    const result = resize('se', 0, { x: 150, y: 0 }, { keepRatio: true })
    expect(result.width).toBe(450)
    expect(result.height).toBe(180)
    expect(result.x).toBe(100)
    expect(result.y).toBe(200)
  })

  it('keeps the ratio from an edge handle around the opposite edge midpoint', () => {
    const result = resize('e', 0, { x: 300, y: 0 }, { keepRatio: true })
    expect(result).toEqual({ x: 100, y: 140, width: 600, height: 240 })
  })

  it('grows symmetrically from the center', () => {
    expect(resize('e', 0, { x: 10, y: 0 }, { fromCenter: true })).toEqual({
      x: 90,
      y: 200,
      width: 320,
      height: 120,
    })
  })

  it('never shrinks below the minimum size', () => {
    const result = resize('se', 0, { x: -1000, y: -1000 }, { min: 1 })
    expect(result.width).toBe(1)
    expect(result.height).toBe(1)
    expect(result.x).toBe(100)
    expect(result.y).toBe(200)
  })
})

describe('resizeBox keeps the anchor still under rotation', () => {
  const angles = [45, 90, -30, 17.5]
  const deltas = [
    { x: 30, y: 0 },
    { x: -12, y: 25 },
    { x: 8, y: -40 },
  ]

  for (const angle of angles) {
    for (const handle of handles) {
      it(`${handle} at ${angle}°`, () => {
        for (const delta of deltas) {
          const anchor = anchorFractionOf(handle, false)
          const before = pointOnBox(box, angle, center, anchor)
          const after = resize(handle, angle, delta)
          expectPoint(pointOnBox(after, angle, center, anchor), before)
        }
      })
    }
  }

  it('keeps the center still when resizing from the center', () => {
    const before = pointOnBox(box, 60, center, center)
    const after = resize('ne', 60, { x: 20, y: -15 }, { fromCenter: true })
    expectPoint(pointOnBox(after, 60, center, center), before)
    expect(after.width).not.toBe(box.width)
  })

  it('respects a non-centered transform origin', () => {
    const origin = { x: 0, y: 0 }
    const anchor = anchorFractionOf('se', false)
    const before = pointOnBox(box, 30, origin, anchor)
    const after = resizeBox({
      box,
      angle: 30,
      origin,
      handle: 'se',
      delta: { x: 40, y: 10 },
      keepRatio: false,
      fromCenter: false,
      min: 1,
    })
    expectPoint(pointOnBox(after, 30, origin, anchor), before)
  })

  it('applies the pointer delta in the local axis', () => {
    const after = resize('e', 90, { x: 0, y: 50 })
    expect(after.width).toBeCloseTo(350, 6)
    expect(after.height).toBeCloseTo(120, 6)
  })
})

describe('snapResizeEdges', () => {
  const page = { width: 1200, height: 1600 }
  const siblings: Box[] = [{ x: 500, y: 200, width: 100, height: 100 }]

  it('snaps the moving edge to a sibling edge and reports a guide', () => {
    const moving: Box = { x: 100, y: 200, width: 397, height: 120 }
    const { box: snapped, guides } = snapResizeEdges(moving, 'e', siblings, page, 4)
    expect(snapped.width).toBe(400)
    expect(snapped.x).toBe(100)
    expect(guides).toEqual([{ axis: 'vertical', at: 500, from: 200, to: 320 }])
  })

  it('moves the origin when the west or north edge snaps', () => {
    const moving: Box = { x: 602, y: 297, width: 100, height: 50 }
    const { box: snapped } = snapResizeEdges(moving, 'nw', siblings, page, 4)
    expect(snapped).toEqual({ x: 600, y: 300, width: 102, height: 47 })
  })

  it('ignores axes the handle does not move and distances beyond the threshold', () => {
    const moving: Box = { x: 100, y: 200, width: 397, height: 97 }
    const { box: snapped, guides } = snapResizeEdges(moving, 's', siblings, page, 4)
    expect(snapped).toEqual({ x: 100, y: 200, width: 397, height: 100 })
    expect(guides).toHaveLength(1)
    expect(snapResizeEdges(moving, 'e', siblings, page, 2).guides).toEqual([])
  })
})
