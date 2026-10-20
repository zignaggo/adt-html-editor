import { describe, expect, it } from 'vitest'
import type { StyleReader } from '../capabilities'
import {
  componentBlock,
  componentOf,
  isFlowContainer,
  isMediaGroup,
  isWrappableObject,
  looksLikeComponent,
  movableComponent,
} from '../component/componentLayout'

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
  gridAutoFlow: 'row',
  gridColumn: 'auto',
  gridRow: 'auto',
  borderStyle: 'none',
  boxShadow: 'none',
  backgroundColor: 'rgba(0, 0, 0, 0)',
  direction: 'ltr',
}

function readerFor(styles: Map<Element, Declared>): StyleReader {
  return (element) => ({ ...DEFAULTS, ...(styles.get(element) ?? {}) }) as unknown as CSSStyleDeclaration
}

function build(html: string) {
  const canvas = document.createElement('div')
  canvas.setAttribute('data-adt-canvas', '')
  canvas.innerHTML = html
  document.body.appendChild(canvas)
  return {
    canvas,
    styles: new Map<Element, Declared>(),
    pick: (selector: string) => canvas.querySelector<HTMLElement>(selector)!,
  }
}

describe('componentOf', () => {
  it('promotes an inline to the paragraph around it', () => {
    const { styles, pick } = build('<p id="p">text <span id="s">word</span></p>')
    const span = pick('#s')
    styles.set(span, { display: 'inline' })

    expect(componentOf(span, readerFor(styles)).id).toBe('p')
  })

  it('promotes to the closest figure', () => {
    const { styles, pick } = build('<figure id="f"><img id="i" /><figcaption id="c">a</figcaption></figure>')
    expect(componentOf(pick('#c'), readerFor(styles)).id).toBe('f')
  })

  it('promotes an image to a paragraph that holds only it', () => {
    const { styles, pick } = build('<p id="p"><img id="i" /></p>')
    expect(componentOf(pick('#i'), readerFor(styles)).id).toBe('p')
  })

  it('keeps an image that shares its paragraph with text', () => {
    const { styles, pick } = build('<p id="p">caption <img id="i" /></p>')
    expect(componentOf(pick('#i'), readerFor(styles)).id).toBe('i')
  })

  it('promotes to a media group', () => {
    const { styles, pick } = build(
      '<div id="g"><img id="i" /><figcaption>a</figcaption><p>note</p></div>',
    )
    expect(componentOf(pick('#i'), readerFor(styles)).id).toBe('g')
  })

  it('ends on a single-child container marker', () => {
    const { styles, pick } = build(
      '<div id="box" data-responsive-container="true"><aside id="a">x</aside></div>',
    )
    expect(componentOf(pick('#a'), readerFor(styles)).id).toBe('box')
  })
})

describe('isMediaGroup', () => {
  it('accepts one image with a caption and one paragraph', () => {
    const { styles, pick } = build('<div id="g"><img /><figcaption>a</figcaption><p>b</p></div>')
    expect(isMediaGroup(pick('#g'), readerFor(styles))).toBe(true)
  })

  it('refuses two paragraphs', () => {
    const { styles, pick } = build('<div id="g"><img /><p>a</p><p>b</p></div>')
    expect(isMediaGroup(pick('#g'), readerFor(styles))).toBe(false)
  })

  it('allows positioned labels beside the image', () => {
    const { styles, pick } = build('<div id="g"><img /><span id="l">1</span></div>')
    styles.set(pick('#l'), { position: 'absolute' })
    expect(isMediaGroup(pick('#g'), readerFor(styles))).toBe(true)
  })
})

describe('componentBlock', () => {
  it('passes a plain section', () => {
    const { styles, pick } = build('<section id="s"></section>')
    expect(componentBlock(pick('#s'), readerFor(styles))).toBeNull()
  })

  it('refuses a tag outside the whitelist', () => {
    const { styles, pick } = build('<span id="s"></span>')
    expect(componentBlock(pick('#s'), readerFor(styles))).toBe('unsupported-tag')
  })

  it('refuses something inside a sentence', () => {
    const { styles, pick } = build('<p><img id="i" /></p>')
    expect(componentBlock(pick('#i'), readerFor(styles))).toBe('phrase-ancestor')
  })

  it('refuses a list item', () => {
    const { styles, pick } = build('<ul><li><div id="d"></div></li></ul>')
    expect(componentBlock(pick('#d'), readerFor(styles))).toBe('list-ancestor')
  })

  it('refuses a transformed ancestor', () => {
    const { styles, pick } = build('<div id="outer"><div id="d"></div></div>')
    styles.set(pick('#outer'), { transform: 'rotate(3deg)' })
    expect(componentBlock(pick('#d'), readerFor(styles))).toBe('transformed')
  })

  it('refuses an element CSS places explicitly', () => {
    const { styles, pick } = build('<div id="d"></div>')
    styles.set(pick('#d'), { gridColumn: '2 / 4' })
    expect(componentBlock(pick('#d'), readerFor(styles))).toBe('placed')
  })

  it('refuses a reversed parent', () => {
    const { styles, pick } = build('<div id="row"><div id="d"></div></div>')
    styles.set(pick('#row'), { display: 'flex', flexDirection: 'row-reverse' })
    expect(componentBlock(pick('#d'), readerFor(styles))).toBe('reversed-parent')
  })

  it('movableComponent returns the promoted piece or nothing', () => {
    const { styles, pick } = build('<figure id="f"><img id="i" /></figure>')
    expect(movableComponent(pick('#i'), readerFor(styles))?.id).toBe('f')

    const blocked = build('<ul><li><div id="d"></div></li></ul>')
    expect(movableComponent(blocked.pick('#d'), readerFor(blocked.styles))).toBeNull()
  })
})

describe('looksLikeComponent', () => {
  it('takes the sectioning tags', () => {
    const { styles, pick } = build('<aside id="a"></aside><div id="d"></div>')
    const read = readerFor(styles)
    expect(looksLikeComponent(pick('#a'), read)).toBe(true)
    expect(looksLikeComponent(pick('#d'), read)).toBe(false)
  })

  it('takes a div that reads as a card', () => {
    const { styles, pick } = build('<div id="d"></div>')
    styles.set(pick('#d'), { boxShadow: '0 1px 2px rgba(0,0,0,.2)' })
    expect(looksLikeComponent(pick('#d'), readerFor(styles))).toBe(true)
  })
})

describe('containers and wrappable objects', () => {
  it('refuses a list or a table as a drop container', () => {
    const { styles, pick } = build('<ul id="u"></ul><div id="d"></div>')
    const read = readerFor(styles)
    expect(isFlowContainer(pick('#u'), read)).toBe(false)
    expect(isFlowContainer(pick('#d'), read)).toBe(true)
  })

  it('wraps text around a figure, an image or a floated element', () => {
    const { styles, pick } = build('<figure id="f"></figure><img id="i" /><div id="d"></div>')
    const read = readerFor(styles)
    expect(isWrappableObject(pick('#f'), read)).toBe(true)
    expect(isWrappableObject(pick('#i'), read)).toBe(true)
    expect(isWrappableObject(pick('#d'), read)).toBe(false)

    styles.set(pick('#d'), { float: 'left' })
    expect(isWrappableObject(pick('#d'), readerFor(styles))).toBe(true)
  })
})
