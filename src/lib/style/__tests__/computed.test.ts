import { describe, expect, it } from 'vitest'
import { alignName, lineHeightRatio, parsePx, rgbToHex, weightName } from '../computed'

describe('computed style helpers', () => {
  it('parses pixel lengths', () => {
    expect(parsePx('16px')).toBe(16)
    expect(parsePx('13.333px')).toBe(13.33)
    expect(parsePx('auto')).toBeNull()
    expect(parsePx(undefined)).toBeNull()
  })

  it('names weights by nearest step', () => {
    expect(weightName('700')).toBe('bold')
    expect(weightName('450')).toBe('normal')
    expect(weightName('normal')).toBe('normal')
    expect(weightName('bolder')).toBeNull()
  })

  it('normalises alignment and line height', () => {
    expect(alignName('start')).toBe('left')
    expect(alignName('center')).toBe('center')
    expect(alignName('match-parent')).toBeNull()
    expect(lineHeightRatio('24px', '16px')).toBe(1.5)
    expect(lineHeightRatio('normal', '16px')).toBeNull()
  })

  it('converts rgb() to hex and zero alpha to transparent', () => {
    expect(rgbToHex('rgb(239, 68, 68)')).toBe('#ef4444')
    expect(rgbToHex('rgba(0, 0, 0, 0)')).toBe('transparent')
    expect(rgbToHex('rgb(0 0 0 / 0.5)')).toBe('#000000')
    expect(rgbToHex('oklch(0.5 0.1 200)')).toBeNull()
  })
})
