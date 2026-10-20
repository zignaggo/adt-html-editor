import { describe, expect, it } from 'vitest'
import { parseHtml } from '../../core/html/parse'
import { childrenOf } from '../../core/model'
import { pickSlot, reorderSlots } from '../gestures/flowOrder'
import type { StyleReader } from '../capabilities'

const INLINE_TAGS = new Set(['SPAN', 'A', 'EM', 'STRONG'])

const read: StyleReader = (element) =>
  ({ display: INLINE_TAGS.has(element.tagName) ? 'inline' : 'block' }) as unknown as CSSStyleDeclaration

function render(html: string) {
  const doc = parseHtml(html)
  const root = document.createElement('div')
  const children = childrenOf(doc, doc.rootId)

  children.forEach((childId, order) => {
    const node = doc.nodes[childId]
    if (node.kind !== 'element') return
    const element = document.createElement(node.tag)
    element.setAttribute('data-adt-id', childId)
    element.getBoundingClientRect = () =>
      ({ top: order * 100, bottom: order * 100 + 80 }) as DOMRect
    root.appendChild(element)
  })

  return { doc, root, children }
}

describe('reorderSlots', () => {
  it('gives a slot per block plus one after the last', () => {
    const { doc, root } = render('<div></div><p></p>')
    const slots = reorderSlots(doc, doc.rootId, root, 0, read)

    expect(slots).toEqual([
      { index: 0, y: 0 },
      { index: 1, y: 100 },
      { index: 2, y: 180 },
    ])
  })

  it('collapses consecutive inlines into one slot', () => {
    const { doc, root } = render('<span></span><a></a><div></div>')
    const slots = reorderSlots(doc, doc.rootId, root, 0, read)

    expect(slots).toEqual([
      { index: 0, y: 0 },
      { index: 2, y: 200 },
      { index: 3, y: 280 },
    ])
  })

  it('offsets the slots by the host origin', () => {
    const { doc, root } = render('<div></div>')
    expect(reorderSlots(doc, doc.rootId, root, 40, read)?.[0]).toEqual({ index: 0, y: -40 })
  })

  it('returns null when the rendered tree lost a node', () => {
    const { doc, root } = render('<div></div><p></p>')
    root.firstElementChild?.remove()

    expect(reorderSlots(doc, doc.rootId, root, 0, read)).toBeNull()
  })

  it('returns no slots for an empty parent', () => {
    const { doc, root } = render('')
    expect(reorderSlots(doc, doc.rootId, root, 0, read)).toEqual([])
  })
})

describe('pickSlot', () => {
  const slots = [
    { index: 0, y: 0 },
    { index: 1, y: 100 },
    { index: 2, y: 180 },
  ]

  it('takes the nearest slot', () => {
    expect(pickSlot(slots, 90)?.index).toBe(1)
    expect(pickSlot(slots, 170)?.index).toBe(2)
  })

  it('has nothing to pick from an empty list', () => {
    expect(pickSlot([], 10)).toBeNull()
  })
})
