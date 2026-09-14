import { describe, expect, it } from 'vitest'
import type { Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { computeInsideSpot, computeZone } from '../canvasHitbox'
import { acceptsNesting } from '../useCanvasDropTarget'
import { parseHtml } from '../../core/html/parse'
import { childrenOf } from '../../core/model'

function rectOf(box: { top: number; left: number; width: number; height: number }): DOMRect {
  const full = {
    ...box,
    bottom: box.top + box.height,
    right: box.left + box.width,
    x: box.left,
    y: box.top,
  }
  return { ...full, toJSON: () => full } as DOMRect
}

function inputAt(clientX: number, clientY: number): Input {
  return {
    altKey: false,
    button: 0,
    buttons: 1,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    clientX,
    clientY,
    pageX: clientX,
    pageY: clientY,
  }
}

const tall = rectOf({ top: 0, left: 0, width: 200, height: 400 })

describe('computeZone', () => {
  it('without nesting, splits the element in half', () => {
    expect(computeZone({ rect: tall, input: inputAt(100, 100), axis: 'column', canNest: false })).toEqual({
      type: 'edge',
      edge: 'top',
    })
    expect(computeZone({ rect: tall, input: inputAt(100, 300), axis: 'column', canNest: false })).toEqual({
      type: 'edge',
      edge: 'bottom',
    })
  })

  it('with nesting, the center becomes the inside zone', () => {
    expect(computeZone({ rect: tall, input: inputAt(100, 200), axis: 'column', canNest: true })).toEqual({
      type: 'inside',
    })
  })

  it('keeps a 16 px edge band on large elements', () => {
    expect(computeZone({ rect: tall, input: inputAt(100, 4), axis: 'column', canNest: true })).toEqual({
      type: 'edge',
      edge: 'top',
    })
    expect(computeZone({ rect: tall, input: inputAt(100, 396), axis: 'column', canNest: true })).toEqual({
      type: 'edge',
      edge: 'bottom',
    })
    expect(computeZone({ rect: tall, input: inputAt(100, 20), axis: 'column', canNest: true })).toEqual({
      type: 'inside',
    })
  })

  it('on short elements the band shrinks to 30% and an inside zone remains', () => {
    const short = rectOf({ top: 0, left: 0, width: 200, height: 20 })
    expect(computeZone({ rect: short, input: inputAt(100, 2), axis: 'column', canNest: true })).toEqual({
      type: 'edge',
      edge: 'top',
    })
    expect(computeZone({ rect: short, input: inputAt(100, 10), axis: 'column', canNest: true })).toEqual({
      type: 'inside',
    })
  })

  it('uses the horizontal axis in row layout', () => {
    const wide = rectOf({ top: 0, left: 0, width: 400, height: 100 })
    expect(computeZone({ rect: wide, input: inputAt(4, 50), axis: 'row', canNest: true })).toEqual({
      type: 'edge',
      edge: 'left',
    })
    expect(computeZone({ rect: wide, input: inputAt(396, 50), axis: 'row', canNest: true })).toEqual({
      type: 'edge',
      edge: 'right',
    })
    expect(computeZone({ rect: wide, input: inputAt(200, 50), axis: 'row', canNest: true })).toEqual({
      type: 'inside',
    })
  })

  it('an element with no size falls back to edge', () => {
    const empty = rectOf({ top: 0, left: 0, width: 0, height: 0 })
    expect(computeZone({ rect: empty, input: inputAt(0, 0), axis: 'column', canNest: true })).toEqual({
      type: 'edge',
      edge: 'top',
    })
  })
})

describe('acceptsNesting', () => {
  it('accepts an empty container', () => {
    const doc = parseHtml('<div></div>')
    const div = childrenOf(doc, doc.rootId)[0]
    expect(acceptsNesting(doc, doc.nodes[div])).toBe(true)
  })

  it('accepts a container with element children', () => {
    const doc = parseHtml('<div><span>a</span></div>')
    const div = childrenOf(doc, doc.rootId)[0]
    expect(acceptsNesting(doc, doc.nodes[div])).toBe(true)
  })

  it('refuses an element that only has text', () => {
    const doc = parseHtml('<p>text only</p>')
    const p = childrenOf(doc, doc.rootId)[0]
    expect(acceptsNesting(doc, doc.nodes[p])).toBe(false)
  })

  it('refuses a void tag', () => {
    const doc = parseHtml('<img src="a.png">')
    const img = childrenOf(doc, doc.rootId)[0]
    expect(acceptsNesting(doc, doc.nodes[img])).toBe(false)
  })

  it('refuses an opaque node', () => {
    const doc = parseHtml('<svg></svg>')
    const svg = childrenOf(doc, doc.rootId)[0]
    expect(acceptsNesting(doc, doc.nodes[svg])).toBe(false)
  })
})

describe('computeInsideSpot', () => {
  function container(childBoxes: { top: number; height: number }[]) {
    const element = document.createElement('div')
    childBoxes.forEach((box, index) => {
      const child = document.createElement('div')
      child.setAttribute('data-adt-id', `c${index}`)
      child.getBoundingClientRect = () =>
        rectOf({ top: box.top, left: 0, width: 200, height: box.height })
      element.appendChild(child)
    })
    return element
  }

  it('without children, returns no line', () => {
    const spot = computeInsideSpot(container([]), inputAt(100, 50), 'column')
    expect(spot).toEqual({ beforeId: null, line: null })
  })

  it('above the middle of the first child, inserts before it', () => {
    const spot = computeInsideSpot(
      container([
        { top: 0, height: 100 },
        { top: 100, height: 100 },
      ]),
      inputAt(100, 20),
      'column',
    )
    expect(spot.beforeId).toBe('c0')
    expect(spot.line).toEqual({ axis: 'horizontal', start: 0, cross: 0, length: 200 })
  })

  it('between two children, inserts before the second', () => {
    const spot = computeInsideSpot(
      container([
        { top: 0, height: 100 },
        { top: 100, height: 100 },
      ]),
      inputAt(100, 120),
      'column',
    )
    expect(spot.beforeId).toBe('c1')
    expect(spot.line?.cross).toBe(100)
  })

  it('after the last child, appends at the end', () => {
    const spot = computeInsideSpot(
      container([
        { top: 0, height: 100 },
        { top: 100, height: 100 },
      ]),
      inputAt(100, 190),
      'column',
    )
    expect(spot.beforeId).toBeNull()
    expect(spot.line).toEqual({ axis: 'horizontal', start: 0, cross: 200, length: 200 })
  })

  it('ignores children without data-adt-id', () => {
    const element = container([{ top: 0, height: 100 }])
    const stray = document.createElement('span')
    element.appendChild(stray)
    const spot = computeInsideSpot(element, inputAt(100, 90), 'column')
    expect(spot.beforeId).toBeNull()
  })
})
