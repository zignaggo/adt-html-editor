import { afterEach, describe, expect, it } from 'vitest'
import { hasTransformedAncestor, layoutOriginOf, readLayoutBox } from '../transform/layoutBox'

type Offsets = { left: number; top: number; width: number; height: number; parent?: HTMLElement }

function layout(element: HTMLElement, offsets: Offsets) {
  Object.defineProperties(element, {
    offsetLeft: { value: offsets.left, configurable: true },
    offsetTop: { value: offsets.top, configurable: true },
    offsetWidth: { value: offsets.width, configurable: true },
    offsetHeight: { value: offsets.height, configurable: true },
    offsetParent: { value: offsets.parent ?? null, configurable: true },
  })
}

const mounted: HTMLElement[] = []

function mount(tag = 'div'): HTMLElement {
  const element = document.createElement(tag)
  document.body.appendChild(element)
  mounted.push(element)
  return element
}

afterEach(() => {
  for (const element of mounted.splice(0)) element.remove()
})

describe('readLayoutBox', () => {
  it('reads a direct child of the page in page units', () => {
    const page = mount()
    const child = document.createElement('p')
    page.appendChild(child)
    layout(child, { left: 96, top: 140, width: 700, height: 96, parent: page })
    expect(readLayoutBox(child, page)).toEqual({ x: 96, y: 140, width: 700, height: 96 })
    expect(layoutOriginOf(child, page)).toEqual({ x: 0, y: 0 })
  })

  it('accumulates offsets and borders through positioned ancestors', () => {
    const page = mount()
    const card = document.createElement('div')
    const text = document.createElement('p')
    page.appendChild(card)
    card.appendChild(text)
    layout(card, { left: 96, top: 620, width: 480, height: 640, parent: page })
    Object.defineProperties(card, {
      clientLeft: { value: 2, configurable: true },
      clientTop: { value: 3, configurable: true },
    })
    layout(text, { left: 40, top: 100, width: 400, height: 60, parent: card })
    expect(readLayoutBox(text, page)).toEqual({ x: 138, y: 723, width: 400, height: 60 })
    expect(layoutOriginOf(text, page)).toEqual({ x: 98, y: 623 })
  })

  it('stops at the origin even when the offset chain continues above it', () => {
    const outer = mount()
    const page = document.createElement('div')
    const child = document.createElement('div')
    outer.appendChild(page)
    page.appendChild(child)
    layout(page, { left: 500, top: 500, width: 1200, height: 1600, parent: outer })
    layout(child, { left: 10, top: 20, width: 30, height: 40, parent: outer })
    expect(readLayoutBox(child, page)).toEqual({ x: 10, y: 20, width: 30, height: 40 })
  })
})

describe('hasTransformedAncestor', () => {
  it('detects a transform between the element and the page', () => {
    const page = mount()
    const group = document.createElement('div')
    const child = document.createElement('span')
    page.appendChild(group)
    group.appendChild(child)
    expect(hasTransformedAncestor(child, page)).toBe(false)
    group.style.transform = 'rotate(10deg)'
    expect(hasTransformedAncestor(child, page)).toBe(true)
  })
})
