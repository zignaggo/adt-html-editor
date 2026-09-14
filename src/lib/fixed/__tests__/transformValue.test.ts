import { describe, expect, it } from 'vitest'
import {
  angleToDegrees,
  decomposeMatrix,
  inlineRotation,
  normalizeAngle,
  parseTransform,
  rotationIn,
  withRotation,
} from '../transform/transformValue'

describe('parseTransform', () => {
  it('splits a list of functions keeping order and arguments', () => {
    expect(parseTransform('translate(10px, 20px) scale(1.5) rotate(30deg)')).toEqual([
      { name: 'translate', args: '10px, 20px' },
      { name: 'scale', args: '1.5' },
      { name: 'rotate', args: '30deg' },
    ])
  })

  it('treats none and empty values as no functions', () => {
    expect(parseTransform('none')).toEqual([])
    expect(parseTransform(undefined)).toEqual([])
  })
})

describe('angleToDegrees', () => {
  it('converts every CSS angle unit', () => {
    expect(angleToDegrees('45deg')).toBe(45)
    expect(angleToDegrees('0.5turn')).toBe(180)
    expect(angleToDegrees('100grad')).toBe(90)
    expect(angleToDegrees(`${Math.PI}rad`)).toBeCloseTo(180, 6)
    expect(angleToDegrees('0')).toBe(0)
    expect(angleToDegrees('big')).toBeNull()
  })
})

describe('normalizeAngle', () => {
  it('keeps angles in (-180, 180]', () => {
    expect(normalizeAngle(190)).toBe(-170)
    expect(normalizeAngle(-180)).toBe(180)
    expect(normalizeAngle(540)).toBe(180)
    expect(normalizeAngle(-0)).toBe(0)
  })
})

describe('decomposeMatrix', () => {
  it('extracts rotation and scale from a 2d matrix', () => {
    const radians = (30 * Math.PI) / 180
    const matrix = `matrix(${2 * Math.cos(radians)}, ${2 * Math.sin(radians)}, ${-3 * Math.sin(radians)}, ${3 * Math.cos(radians)}, 10, 20)`
    const decomposed = decomposeMatrix(matrix)
    expect(decomposed?.rotation).toBeCloseTo(30, 6)
    expect(decomposed?.scaleX).toBeCloseTo(2, 6)
    expect(decomposed?.scaleY).toBeCloseTo(3, 6)
  })

  it('reads the planar components of matrix3d', () => {
    const decomposed = decomposeMatrix('matrix3d(0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)')
    expect(decomposed?.rotation).toBeCloseTo(90, 6)
  })

  it('rejects other values', () => {
    expect(decomposeMatrix('none')).toBeNull()
    expect(decomposeMatrix('matrix(1, 2)')).toBeNull()
  })
})

describe('rotationIn', () => {
  it('sums rotate functions and decomposes matrices', () => {
    expect(rotationIn('rotate(20deg) rotate(0.25turn)')).toBe(110)
    expect(rotationIn('matrix(0, 1, -1, 0, 0, 0)')).toBeCloseTo(90, 6)
    expect(rotationIn('scale(2)')).toBeNull()
  })

  it('reads the inline rotation out of a style attribute', () => {
    expect(inlineRotation('left: 1px; transform: scale(2) rotate(-15deg)')).toBe(-15)
    expect(inlineRotation('left: 1px')).toBe(0)
  })
})

describe('withRotation', () => {
  it('replaces the existing rotate in place and keeps other functions', () => {
    expect(withRotation('transform: translate(4px) rotate(10deg) scale(2)', 45)).toBe(
      'transform: translate(4px) scale(2) rotate(45deg)',
    )
  })

  it('appends rotate when missing and removes it at zero', () => {
    expect(withRotation('left: 10px', 30)).toBe('left: 10px; transform: rotate(30deg)')
    expect(withRotation('left: 10px; transform: rotate(30deg)', 0)).toBe('left: 10px')
    expect(withRotation('transform: scale(2) rotate(30deg)', 0)).toBe('transform: scale(2)')
  })

  it('is idempotent for the last angle and rounds to a tenth of a degree', () => {
    const style = 'top: 2px; transform: scale(1.2)'
    expect(withRotation(withRotation(style, 12), 33.333)).toBe(withRotation(style, 33.3))
    expect(withRotation(style, 370)).toBe('top: 2px; transform: scale(1.2) rotate(10deg)')
  })
})
