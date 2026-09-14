import { describe, expect, it } from 'vitest'
import {
  hasFrozenPosition,
  positionDeclarations,
  readDeclaredPosition,
  sizeDeclarations,
  withDeclarations,
} from '../position'

describe('positionDeclarations', () => {
  it('freezes right/bottom and percentages into left/top pixels', () => {
    expect(positionDeclarations('position: fixed; right: 10%; bottom: 20px; color: red', 12.4, 33.6, 1)).toBe(
      'position: absolute; color: red; left: 12px; top: 34px',
    )
  })

  it('keeps other declarations and their order, updating left/top in place', () => {
    expect(positionDeclarations('left: 1px; width: 40px; top: 2px', 5, 6, 1)).toBe(
      'left: 5px; width: 40px; top: 6px; position: absolute',
    )
  })

  it('respects the precision', () => {
    expect(positionDeclarations(undefined, 10.26, 0.74, 0.5)).toBe('position: absolute; left: 10.5px; top: 0.5px')
  })
})

describe('hasFrozenPosition / readDeclaredPosition', () => {
  it('requires px left and top and no right/bottom', () => {
    expect(hasFrozenPosition('left: 1px; top: 2px')).toBe(true)
    expect(hasFrozenPosition('left: 10%; top: 2px')).toBe(false)
    expect(hasFrozenPosition('left: 1px; top: 2px; right: 0')).toBe(false)
    expect(hasFrozenPosition(undefined)).toBe(false)
    expect(readDeclaredPosition('left: 1.5px; top: -2px')).toEqual({ x: 1.5, y: -2 })
    expect(readDeclaredPosition('top: 2px')).toBeNull()
  })
})

describe('sizeDeclarations / withDeclarations', () => {
  it('writes width and height independently', () => {
    expect(sizeDeclarations('left: 1px', 100.4, null, 1)).toBe('left: 1px; width: 100px')
    expect(sizeDeclarations('left: 1px', null, 20, 1)).toBe('left: 1px; height: 20px')
  })

  it('adds inherited declarations without overriding declared ones', () => {
    const extra = new Map([
      ['color', 'red'],
      ['font-size', '20px'],
    ])
    expect(withDeclarations('color: blue', extra)).toBe('color: blue; font-size: 20px')
  })
})
