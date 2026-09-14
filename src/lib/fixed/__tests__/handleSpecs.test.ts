import { describe, expect, it } from 'vitest'
import { HANDLE_SPECS, anchorFractionOf, cursorFor, isCorner, movesX, movesY } from '../transform/handleSpecs'

describe('handle specs', () => {
  it('lists the eight handles around the box', () => {
    expect(HANDLE_SPECS.map((spec) => spec.id)).toEqual(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'])
  })

  it('classifies which axes each handle moves', () => {
    expect(movesX('e')).toBe(true)
    expect(movesX('n')).toBe(false)
    expect(movesY('sw')).toBe(true)
    expect(movesY('w')).toBe(false)
    expect(isCorner('ne')).toBe(true)
    expect(isCorner('s')).toBe(false)
  })

  it('anchors on the opposite side, or on the center', () => {
    expect(anchorFractionOf('se', false)).toEqual({ x: 0, y: 0 })
    expect(anchorFractionOf('n', false)).toEqual({ x: 0.5, y: 1 })
    expect(anchorFractionOf('w', false)).toEqual({ x: 1, y: 0.5 })
    expect(anchorFractionOf('nw', true)).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('cursorFor', () => {
  it('matches the compass direction when not rotated', () => {
    expect(cursorFor('n', 0)).toBe('ns-resize')
    expect(cursorFor('ne', 0)).toBe('nesw-resize')
    expect(cursorFor('e', 0)).toBe('ew-resize')
    expect(cursorFor('se', 0)).toBe('nwse-resize')
    expect(cursorFor('sw', 0)).toBe('nesw-resize')
  })

  it('rotates the cursor with the element in 45° sectors', () => {
    expect(cursorFor('n', 90)).toBe('ew-resize')
    expect(cursorFor('e', 45)).toBe('nwse-resize')
    expect(cursorFor('e', -45)).toBe('nesw-resize')
    expect(cursorFor('n', 20)).toBe('ns-resize')
    expect(cursorFor('n', 25)).toBe('nesw-resize')
    expect(cursorFor('s', 360)).toBe('ns-resize')
  })
})
