import { describe, expect, it } from 'vitest'
import { measureScale, readBox, roundTo, toPage } from '../geometry'

function rect(left: number, top: number, width: number, height: number): DOMRect {
  const box = { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }
  return { ...box, toJSON: () => box } as DOMRect
}

describe('geometry', () => {
  it('measures the scale from the page rect', () => {
    expect(measureScale(rect(0, 0, 600, 800), 1200)).toBe(0.5)
    expect(measureScale(rect(0, 0, 0, 0), 1200)).toBe(1)
    expect(measureScale(rect(0, 0, 600, 800), 0)).toBe(1)
  })

  it('converts client coordinates to page units', () => {
    expect(toPage({ x: 150, y: 250 }, rect(100, 200, 600, 800), 0.5)).toEqual({ x: 100, y: 100 })
  })

  it('rounds to a precision without float noise', () => {
    expect(roundTo(10.6, 1)).toBe(11)
    expect(roundTo(10.26, 0.5)).toBe(10.5)
    expect(roundTo(10.26, 0.1)).toBe(10.3)
    expect(roundTo(10.26, 0)).toBe(10.26)
  })

  it('reads an element box relative to the page and scale', () => {
    const element = document.createElement('div')
    element.getBoundingClientRect = () => rect(160, 260, 100, 50)
    const page = document.createElement('div')
    page.getBoundingClientRect = () => rect(100, 200, 600, 800)
    expect(readBox(element, page, 0.5)).toEqual({ x: 120, y: 120, width: 200, height: 100 })
  })
})
