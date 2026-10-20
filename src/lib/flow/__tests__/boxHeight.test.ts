import { describe, expect, it } from 'vitest'
import { BASE_TARGET } from '../../tailwind/variants'
import type { StyleReader } from '../capabilities'
import {
  heightClasses,
  heightFrames,
  innerSpaceClasses,
  measureHeight,
  readBoxMetrics,
  type BoxMetrics,
} from '../box/boxHeight'

type Declared = Partial<Record<string, string>>

const DEFAULTS: Record<string, string> = {
  display: 'block',
  position: 'static',
  paddingTop: '0px',
  paddingBottom: '0px',
  borderTopWidth: '0px',
  borderBottomWidth: '0px',
}

function readerFor(styles: Map<Element, Declared>): StyleReader {
  return (element) => ({ ...DEFAULTS, ...(styles.get(element) ?? {}) }) as unknown as CSSStyleDeclaration
}

function build(html: string): HTMLElement {
  const canvas = document.createElement('div')
  canvas.setAttribute('data-adt-canvas', '')
  canvas.innerHTML = html
  return canvas
}

function withScrollHeight(element: HTMLElement, value: number) {
  Object.defineProperty(element, 'scrollHeight', { value, configurable: true })
}

function metrics(fixed: number, padding: ReadonlyArray<[number, number]>): BoxMetrics {
  const entries = padding.map(([top, bottom]) => ({ top, bottom }))
  const total = entries.reduce((sum, entry) => sum + entry.top + entry.bottom, 0)
  return { fixed, total, natural: fixed + total, padding: entries }
}

describe('heightFrames', () => {
  it('descends the chain of single-child div wrappers', () => {
    const canvas = build('<section id="a"><div id="b"><div id="c"><p>Text</p></div></div></section>')
    const target = canvas.querySelector<HTMLElement>('#a')!
    const { frames, blocked } = heightFrames(target, { read: readerFor(new Map()) })

    expect(blocked).toBeNull()
    expect(frames.map((frame) => frame.id)).toEqual(['a', 'b', 'c'])
  })

  it('stops at a wrapper that holds more than one child', () => {
    const canvas = build('<div id="a"><div id="b"><p>One</p><p>Two</p></div></div>')
    const { frames } = heightFrames(canvas.querySelector<HTMLElement>('#a')!, {
      read: readerFor(new Map()),
    })

    expect(frames.map((frame) => frame.id)).toEqual(['a', 'b'])
  })

  it('stops at a wrapper that also holds loose text', () => {
    const canvas = build('<div id="a">Loose<div id="b"></div></div>')
    const { frames } = heightFrames(canvas.querySelector<HTMLElement>('#a')!, {
      read: readerFor(new Map()),
    })

    expect(frames.map((frame) => frame.id)).toEqual(['a'])
  })

  it('refuses a tag that is not a plain box', () => {
    const canvas = build('<p id="a"></p>')

    expect(heightFrames(canvas.querySelector<HTMLElement>('#a')!).blocked).toBe('tag')
  })

  it('refuses when a descendant is positioned by hand', () => {
    const canvas = build('<div id="a"><div id="b"><span id="pin"></span></div></div>')
    const styles = new Map<Element, Declared>()
    styles.set(canvas.querySelector('#pin')!, { position: 'absolute' })
    const result = heightFrames(canvas.querySelector<HTMLElement>('#a')!, {
      read: readerFor(styles),
    })

    expect(result.blocked).toBe('positioned-descendant')
    expect(result.frames).toEqual([])
  })

  it('refuses when a descendant is locked', () => {
    const canvas = build('<div id="a"><div id="b"></div></div>')
    const result = heightFrames(canvas.querySelector<HTMLElement>('#a')!, {
      read: readerFor(new Map()),
      lockedDescendant: true,
    })

    expect(result.blocked).toBe('locked-descendant')
    expect(result.frames).toEqual([])
  })
})

describe('readBoxMetrics', () => {
  it('measures the content first, then the padding of every frame', () => {
    const canvas = build('<div id="a"><div id="b"><p>Text</p></div></div>')
    const outer = canvas.querySelector<HTMLElement>('#a')!
    const inner = canvas.querySelector<HTMLElement>('#b')!
    const styles = new Map<Element, Declared>()
    styles.set(outer, {
      paddingTop: '20px',
      paddingBottom: '20px',
      borderTopStyle: 'solid',
      borderTopWidth: '2px',
    })
    styles.set(inner, { paddingTop: '10px', paddingBottom: '10px' })
    withScrollHeight(inner, 120)

    const measured = readBoxMetrics([outer, inner], readerFor(styles))

    expect(measured.fixed).toBe(102)
    expect(measured.total).toBe(60)
    expect(measured.natural).toBe(162)
    expect(measured.padding).toEqual([
      { top: 20, bottom: 20 },
      { top: 10, bottom: 10 },
    ])
  })
})

describe('measureHeight', () => {
  it('leaves the padding alone when the box only grows', () => {
    const measured = measureHeight(metrics(100, [[20, 20]]), 300)

    expect(measured).toEqual({ height: 300, padding: [{ top: 20, bottom: 20 }], blocked: null })
  })

  it('spends the padding proportionally before anything else', () => {
    const measured = measureHeight(metrics(100, [[20, 20], [10, 10]]), 130)

    expect(measured.height).toBe(130)
    expect(measured.blocked).toBeNull()
    expect(measured.padding).toEqual([
      { top: 10, bottom: 10 },
      { top: 5, bottom: 5 },
    ])
  })

  it('keeps the top-to-bottom ratio of an uneven padding', () => {
    const measured = measureHeight(metrics(100, [[30, 10]]), 120)

    expect(measured.padding).toEqual([{ top: 15, bottom: 5 }])
  })

  it('stops at the content and says it needs the space', () => {
    const measured = measureHeight(metrics(100, [[20, 20]]), 60)

    expect(measured).toEqual({ height: 100, padding: [{ top: 0, bottom: 0 }], blocked: 'content' })
  })
})

describe('height and inner space classes', () => {
  it('writes the height as a floor, with the box borders counted in', () => {
    const classes = heightClasses(['h-40', 'max-h-screen', 'box-content'], 240, BASE_TARGET, {
      center: false,
    })

    expect(classes).toEqual(['h-auto', 'min-h-[240px]', 'max-h-none', 'box-border'])
  })

  it('centres the content when the chain has more than one frame', () => {
    const classes = heightClasses([], 240, BASE_TARGET, { center: true })

    expect(classes).toContain('flex')
    expect(classes).toContain('flex-col')
    expect(classes).toContain('justify-center')
  })

  it('leaves the other breakpoint alone', () => {
    const classes = heightClasses(['max-sm:min-h-[100px]'], 240, { breakpoint: 'desktop', state: null }, {
      center: false,
    })

    expect(classes).toContain('max-sm:min-h-[100px]')
    expect(classes).toContain('min-h-[240px]')
  })

  it('rewrites a shorthand padding as the sides it still means', () => {
    const classes = innerSpaceClasses(['p-6'], 'y', 24, BASE_TARGET)

    expect(classes).toEqual(['pl-6', 'pr-6', 'pt-[24px]', 'pb-[24px]'])
  })

  it('clamps the inner space to the supported range', () => {
    expect(innerSpaceClasses([], 'x', 400, BASE_TARGET)).toEqual(['pl-[160px]', 'pr-[160px]'])
    expect(innerSpaceClasses([], 'x', -20, BASE_TARGET)).toEqual(['pl-[0px]', 'pr-[0px]'])
  })
})
