import { describe, expect, it } from 'vitest'
import { blockReasonOf, inspectFlow, orderElementOf, type StyleReader } from '../capabilities'

type Declared = Partial<Record<string, string>>

const DEFAULTS: Record<string, string> = {
  display: 'block',
  position: 'static',
  float: 'none',
  writingMode: 'horizontal-tb',
  transform: 'none',
  rotate: 'none',
  scale: 'none',
  order: '0',
  flexDirection: 'row',
}

function readerFor(styles: Map<Element, Declared>): StyleReader {
  return (element) => ({ ...DEFAULTS, ...(styles.get(element) ?? {}) }) as unknown as CSSStyleDeclaration
}

function build(html: string): { canvas: HTMLElement; styles: Map<Element, Declared> } {
  const canvas = document.createElement('div')
  canvas.setAttribute('data-adt-canvas', '')
  canvas.innerHTML = html
  return { canvas, styles: new Map() }
}

describe('inspectFlow', () => {
  it('allows every direct control on a plain block', () => {
    const { canvas, styles } = build('<div id="a"></div><div id="b"></div>')
    const target = canvas.querySelector<HTMLElement>('#a')!
    const inspection = inspectFlow(target, readerFor(styles))

    expect(inspection.can).toEqual({ align: true, resize: true, space: true, reorder: true })
  })

  it('blames the row for a flex child', () => {
    const { canvas, styles } = build('<div id="row"><div id="a"></div></div>')
    const row = canvas.querySelector<HTMLElement>('#row')!
    const target = canvas.querySelector<HTMLElement>('#a')!
    styles.set(row, { display: 'flex' })
    const inspection = inspectFlow(target, readerFor(styles))

    expect(inspection.flags.row).toBe(true)
    expect(blockReasonOf(inspection, 'resize')).toBe('row-child')
    expect(blockReasonOf(inspection, 'space')).toBe('row-child')
  })

  it('blames the grid for a grid cell', () => {
    const { canvas, styles } = build('<div id="grid"><div id="a"></div></div>')
    styles.set(canvas.querySelector('#grid')!, { display: 'grid' })
    const inspection = inspectFlow(canvas.querySelector<HTMLElement>('#a')!, readerFor(styles))

    expect(blockReasonOf(inspection, 'resize')).toBe('grid-child')
    expect(blockReasonOf(inspection, 'reorder')).toBe('grid-child')
  })

  it('treats a floated element as constrained', () => {
    const { canvas, styles } = build('<div id="a"></div>')
    const target = canvas.querySelector<HTMLElement>('#a')!
    styles.set(target, { float: 'left' })
    const inspection = inspectFlow(target, readerFor(styles))

    expect(inspection.flags.constrained).toBe(true)
    expect(blockReasonOf(inspection, 'align')).toBe('constrained')
  })

  it('refuses to resize when a descendant is positioned by hand', () => {
    const { canvas, styles } = build('<div id="a"><span id="label"></span></div>')
    styles.set(canvas.querySelector('#label')!, { position: 'absolute' })
    const inspection = inspectFlow(canvas.querySelector<HTMLElement>('#a')!, readerFor(styles))

    expect(blockReasonOf(inspection, 'resize')).toBe('positioned-descendant')
    expect(inspection.can.space).toBe(true)
  })

  it('refuses to reorder when a sibling is reordered by CSS', () => {
    const { canvas, styles } = build('<div id="a"></div><div id="b"></div>')
    styles.set(canvas.querySelector('#b')!, { order: '2' })
    const inspection = inspectFlow(canvas.querySelector<HTMLElement>('#a')!, readerFor(styles))

    expect(inspection.flags.ordered).toBe(false)
    expect(blockReasonOf(inspection, 'reorder')).toBe('unordered-siblings')
  })

  it('reports a transformed ancestor up to the canvas', () => {
    const { canvas, styles } = build('<div id="outer"><div id="a"></div></div>')
    styles.set(canvas.querySelector('#outer')!, { transform: 'rotate(2deg)' })
    const inspection = inspectFlow(canvas.querySelector<HTMLElement>('#a')!, readerFor(styles))

    expect(inspection.flags.transformed).toBe(true)
    expect(blockReasonOf(inspection, 'resize')).toBe('transformed')
  })

  it('ignores a transform on the canvas itself', () => {
    const { canvas, styles } = build('<div id="a"></div>')
    styles.set(canvas, { transform: 'scale(0.5)' })
    const inspection = inspectFlow(canvas.querySelector<HTMLElement>('#a')!, readerFor(styles))

    expect(inspection.flags.transformed).toBe(false)
  })

  it('keeps an inline element out of the box controls', () => {
    const { canvas, styles } = build('<p id="p"><span id="a"></span></p>')
    const target = canvas.querySelector<HTMLElement>('#a')!
    styles.set(target, { display: 'inline' })
    const inspection = inspectFlow(target, readerFor(styles))

    expect(blockReasonOf(inspection, 'align')).toBe('inline')
    expect(blockReasonOf(inspection, 'reorder')).toBe('inline')
  })
})

describe('orderElementOf', () => {
  it('moves the figure when the image is alone inside it', () => {
    const { canvas } = build('<figure id="fig"><img id="img" /></figure>')
    expect(orderElementOf(canvas.querySelector<HTMLElement>('#img')!).id).toBe('fig')
  })

  it('keeps the image when the wrapper also holds text', () => {
    const { canvas } = build('<p id="p">caption <img id="img" /></p>')
    expect(orderElementOf(canvas.querySelector<HTMLElement>('#img')!).id).toBe('img')
  })

  it('promotes to a single-child container marker', () => {
    const { canvas } = build('<div id="box" data-responsive-container="true"><div id="a"></div></div>')
    expect(orderElementOf(canvas.querySelector<HTMLElement>('#a')!).id).toBe('box')
  })
})
