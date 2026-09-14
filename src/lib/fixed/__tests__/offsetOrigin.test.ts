import { describe, expect, it } from 'vitest'
import { offsetOriginOf } from '../geometry'

function rect(left: number, top: number, width: number, height: number): DOMRect {
  const box = { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }
  return { ...box, toJSON: () => box } as DOMRect
}

describe('offsetOriginOf', () => {
  it('is zero for elements positioned against the page itself', () => {
    const page = document.createElement('div')
    page.style.position = 'relative'
    const child = document.createElement('div')
    page.appendChild(child)
    document.body.appendChild(page)
    expect(offsetOriginOf(child, page, 1)).toEqual({ x: 0, y: 0 })
    page.remove()
  })

  it('returns the positioned ancestor origin in page units', () => {
    const page = document.createElement('div')
    page.getBoundingClientRect = () => rect(0, 0, 600, 800)
    const card = document.createElement('div')
    card.style.position = 'absolute'
    card.getBoundingClientRect = () => rect(48, 310, 240, 320)
    const child = document.createElement('p')
    card.appendChild(child)
    page.appendChild(card)
    document.body.appendChild(page)
    Object.defineProperty(child, 'offsetParent', { value: card, configurable: true })
    expect(offsetOriginOf(child, page, 0.5)).toEqual({ x: 96, y: 620 })
    page.remove()
  })
})
