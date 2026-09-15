import { describe, expect, it } from 'vitest'
import { minGroupSize, scaleBoxWithin, unionBoxes } from '../transform/groupBox'
import type { Box } from '../geometry'

const A: Box = { x: 100, y: 200, width: 300, height: 120 }
const B: Box = { x: 500, y: 600, width: 200, height: 100 }

function expectBox(actual: Box, expected: Box) {
  expect(actual.x).toBeCloseTo(expected.x, 6)
  expect(actual.y).toBeCloseTo(expected.y, 6)
  expect(actual.width).toBeCloseTo(expected.width, 6)
  expect(actual.height).toBeCloseTo(expected.height, 6)
}

describe('unionBoxes', () => {
  it('returns null for an empty list', () => {
    expect(unionBoxes([])).toBeNull()
  })

  it('returns the box itself for a single member', () => {
    expect(unionBoxes([A])).toEqual(A)
  })

  it('wraps disjoint boxes', () => {
    expect(unionBoxes([A, B])).toEqual({ x: 100, y: 200, width: 600, height: 500 })
  })

  it('ignores a nested box', () => {
    const inner: Box = { x: 150, y: 220, width: 40, height: 20 }
    expect(unionBoxes([A, inner])).toEqual(A)
  })
})

describe('scaleBoxWithin', () => {
  const from: Box = { x: 100, y: 200, width: 600, height: 500 }
  const to: Box = { x: 100, y: 200, width: 660, height: 550 }

  it('maps position and size proportionally', () => {
    expectBox(scaleBoxWithin(A, from, to), { x: 100, y: 200, width: 330, height: 132 })
    expectBox(scaleBoxWithin(B, from, to), { x: 540, y: 640, width: 220, height: 110 })
  })

  it('handles a negative delta', () => {
    const shrunk: Box = { x: 100, y: 200, width: 300, height: 250 }
    expect(scaleBoxWithin(B, from, shrunk)).toEqual({ x: 300, y: 400, width: 100, height: 50 })
  })

  it('keeps the offset and size when the source axis is zero', () => {
    const flat: Box = { x: 0, y: 0, width: 0, height: 100 }
    const target: Box = { x: 10, y: 0, width: 50, height: 200 }
    expect(scaleBoxWithin({ x: 0, y: 0, width: 20, height: 10 }, flat, target)).toEqual({
      x: 10,
      y: 0,
      width: 20,
      height: 20,
    })
  })
})

describe('minGroupSize', () => {
  it('scales the minimum by the smallest member on each axis', () => {
    const group = { x: 100, y: 200, width: 600, height: 500 }
    expect(minGroupSize([A, B], group, 1)).toEqual({ width: 3, height: 5 })
  })

  it('falls back to the raw minimum without members', () => {
    expect(minGroupSize([], { x: 0, y: 0, width: 10, height: 10 }, 2)).toEqual({
      width: 2,
      height: 2,
    })
  })
})
