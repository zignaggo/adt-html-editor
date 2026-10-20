import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StyleReader } from '../capabilities'
import { dropIndicator, dropLabel, resolveComponentDrop } from '../component/componentDrop'

type Declared = Partial<Record<string, string>>

const DEFAULTS: Record<string, string> = {
  display: 'block',
  position: 'static',
  float: 'none',
  flexDirection: 'row',
  direction: 'ltr',
}

function readerFor(styles: Map<Element, Declared>): StyleReader {
  return (element) => ({ ...DEFAULTS, ...(styles.get(element) ?? {}) }) as unknown as CSSStyleDeclaration
}

function rectOf(box: { left: number; top: number; width: number; height: number }): DOMRect {
  const rect = {
    ...box,
    right: box.left + box.width,
    bottom: box.top + box.height,
    x: box.left,
    y: box.top,
  }
  return { ...rect, toJSON: () => rect } as DOMRect
}

function stub(element: Element, box: { left: number; top: number; width: number; height: number }) {
  element.getBoundingClientRect = () => rectOf(box)
}

function build(html: string) {
  const root = document.createElement('div')
  root.setAttribute('data-adt-canvas', '')
  root.innerHTML = html
  document.body.appendChild(root)
  for (const element of root.querySelectorAll('[id]')) {
    element.setAttribute('data-adt-id', element.id)
  }
  return { root, styles: new Map<Element, Declared>(), pick: (s: string) => root.querySelector<HTMLElement>(s)! }
}

/** jsdom has no hit testing, so the stack under the pointer is declared by the test. */
function pointsAt(...elements: Element[]) {
  Object.defineProperty(document, 'elementsFromPoint', {
    value: () => elements,
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(document, 'elementsFromPoint')
  document.body.innerHTML = ''
})

describe('resolveComponentDrop', () => {
  it('orders before from the top band', () => {
    const { root, styles, pick } = build('<p id="a">one</p><div id="dragged"></div>')
    const target = pick('#a')
    stub(target, { left: 0, top: 0, width: 400, height: 100 })
    pointsAt(target, root)

    const drop = resolveComponentDrop({ clientX: 200, clientY: 10 }, root, pick('#dragged'), readerFor(styles))
    expect(drop).toEqual({ kind: 'before', target })
  })

  it('orders after from the bottom band', () => {
    const { root, styles, pick } = build('<p id="a">one</p><div id="dragged"></div>')
    const target = pick('#a')
    stub(target, { left: 0, top: 0, width: 400, height: 100 })
    pointsAt(target, root)

    const drop = resolveComponentDrop({ clientX: 200, clientY: 92 }, root, pick('#dragged'), readerFor(styles))
    expect(drop?.kind).toBe('after')
  })

  it('makes columns from a side band', () => {
    const { root, styles, pick } = build('<section id="a"></section><div id="dragged"></div>')
    const target = pick('#a')
    stub(target, { left: 0, top: 0, width: 400, height: 100 })
    pointsAt(target, root)

    const left = resolveComponentDrop({ clientX: 20, clientY: 50 }, root, pick('#dragged'), readerFor(styles))
    const right = resolveComponentDrop({ clientX: 380, clientY: 50 }, root, pick('#dragged'), readerFor(styles))
    expect(left?.kind).toBe('left')
    expect(right?.kind).toBe('right')
  })

  it('wraps the text when the side band is a paragraph and the piece is an object', () => {
    const { root, styles, pick } = build('<p id="a">text</p><figure id="dragged"></figure>')
    const target = pick('#a')
    stub(target, { left: 0, top: 0, width: 400, height: 100 })
    pointsAt(target, root)

    const drop = resolveComponentDrop({ clientX: 20, clientY: 50 }, root, pick('#dragged'), readerFor(styles))
    expect(drop?.kind).toBe('float-left')
    expect(dropLabel(drop!)).toBe('Wrap the text, object on the left')
  })

  it('keeps columns when the piece is not wrappable', () => {
    const { root, styles, pick } = build('<p id="a">text</p><div id="dragged"></div>')
    const target = pick('#a')
    stub(target, { left: 0, top: 0, width: 400, height: 100 })
    pointsAt(target, root)

    const drop = resolveComponentDrop({ clientX: 20, clientY: 50 }, root, pick('#dragged'), readerFor(styles))
    expect(drop?.kind).toBe('left')
  })

  it('orders horizontally inside a row, and mirrors it in right-to-left', () => {
    const { root, styles, pick } = build(
      '<div id="row"><div id="a"></div></div><div id="dragged"></div>',
    )
    const row = pick('#row')
    const target = pick('#a')
    styles.set(row, { display: 'flex' })
    stub(target, { left: 0, top: 0, width: 200, height: 100 })
    pointsAt(target, row, root)

    expect(
      resolveComponentDrop({ clientX: 160, clientY: 50 }, root, pick('#dragged'), readerFor(styles))?.kind,
    ).toBe('after')

    styles.set(target, { direction: 'rtl' })
    expect(
      resolveComponentDrop({ clientX: 160, clientY: 50 }, root, pick('#dragged'), readerFor(styles))?.kind,
    ).toBe('before')
  })

  it('drops into the empty space of a container, next to the nearest child', () => {
    const { root, styles, pick } = build(
      '<div id="box"><div id="first"></div><div id="second"></div></div><div id="dragged"></div>',
    )
    const box = pick('#box')
    stub(box, { left: 0, top: 0, width: 400, height: 300 })
    stub(pick('#first'), { left: 0, top: 0, width: 400, height: 80 })
    stub(pick('#second'), { left: 0, top: 100, width: 400, height: 80 })
    pointsAt(box, root)

    const drop = resolveComponentDrop({ clientX: 200, clientY: 95 }, root, pick('#dragged'), readerFor(styles))
    expect(drop?.kind).toBe('before')
    expect(drop?.target.id).toBe('second')
  })

  it('drops inside below the last child', () => {
    const { root, styles, pick } = build('<div id="box"><div id="first"></div></div><div id="dragged"></div>')
    const box = pick('#box')
    stub(box, { left: 0, top: 0, width: 400, height: 300 })
    stub(pick('#first'), { left: 0, top: 0, width: 400, height: 80 })
    pointsAt(box, root)

    const drop = resolveComponentDrop({ clientX: 200, clientY: 150 }, root, pick('#dragged'), readerFor(styles))
    expect(drop).toEqual({ kind: 'inside', target: box })
  })

  it('never targets the dragged piece or its own children', () => {
    const { root, styles, pick } = build('<div id="dragged"><p id="inner">x</p></div>')
    pointsAt(pick('#inner'), pick('#dragged'), root)

    expect(
      resolveComponentDrop({ clientX: 10, clientY: 10 }, root, pick('#dragged'), readerFor(styles)),
    ).toBeNull()
  })
})

describe('dropIndicator', () => {
  it('draws a horizontal line for ordering in a column', () => {
    const { root, styles, pick } = build('<p id="a">one</p><div id="dragged"></div>')
    const target = pick('#a')
    stub(target, { left: 10, top: 20, width: 400, height: 100 })
    pointsAt(target, root)

    const drop = resolveComponentDrop({ clientX: 200, clientY: 25 }, root, pick('#dragged'), readerFor(styles))
    const shape = dropIndicator(drop!, readerFor(styles))
    expect(shape).toMatchObject({ kind: 'line', axis: 'horizontal', left: 10, length: 400 })
  })

  it('draws a box when dropping inside', () => {
    const { root, styles, pick } = build('<div id="box"></div><div id="dragged"></div>')
    const box = pick('#box')
    stub(box, { left: 5, top: 7, width: 300, height: 200 })
    pointsAt(box, root)

    const drop = resolveComponentDrop({ clientX: 150, clientY: 100 }, root, pick('#dragged'), readerFor(styles))
    expect(dropIndicator(drop!, readerFor(styles))).toEqual({
      kind: 'box',
      top: 7,
      left: 5,
      width: 300,
      height: 200,
    })
  })
})
