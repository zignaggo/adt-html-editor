import { afterEach, describe, expect, it } from 'vitest'
import type { StyleReader } from '../../capabilities'
import { inspectGroup, promotionChain, PROMOTION_LIMIT } from '../groupMembers'

type Declaration = Partial<Record<string, string>>

const BASE: Declaration = {
  display: 'block',
  position: 'static',
  float: 'none',
  backgroundColor: 'rgba(0, 0, 0, 0)',
  backgroundImage: 'none',
  borderStyle: 'none',
  overflow: 'visible',
  paddingTop: '0px',
  paddingRight: '0px',
  paddingBottom: '0px',
  paddingLeft: '0px',
}

function readerFor(overrides: Record<string, Declaration> = {}): StyleReader {
  return (element) => {
    const own = element instanceof HTMLElement && element.id ? overrides[element.id] : undefined
    return { ...BASE, ...own } as unknown as CSSStyleDeclaration
  }
}

function mount(markup: string): HTMLElement {
  const canvas = document.createElement('div')
  canvas.setAttribute('data-adt-canvas', '')
  canvas.innerHTML = markup
  document.body.append(canvas)
  return canvas
}

function at(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (!element) throw new Error(`no #${id}`)
  return element
}

function idsOf(elements: readonly HTMLElement[]): string[] {
  return elements.map((element) => element.id)
}

function nest(depth: number): string {
  let markup = '<p id="leaf">Leaf</p>'
  for (let level = depth; level > 0; level -= 1) {
    markup = `<div id="level-${level}">${markup}</div>`
  }
  return markup
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('promotionChain', () => {
  it('climbs single-child wrappers up to the limit', () => {
    mount(`<section id="page">${nest(PROMOTION_LIMIT + 4)}<p id="tail">Tail</p></section>`)
    const chain = promotionChain(at('leaf'), readerFor())
    expect(chain).toHaveLength(PROMOTION_LIMIT + 1)
    expect(chain[0]).toBe(at('leaf'))
    expect(chain[chain.length - 1]).toBe(at(`level-${PROMOTION_LIMIT + 4 - PROMOTION_LIMIT + 1}`))
  })

  it('stops at a wrapper that holds more than one child', () => {
    mount('<section id="page"><div id="wrap"><p id="one">One</p><p id="two">Two</p></div></section>')
    expect(idsOf(promotionChain(at('one'), readerFor()))).toEqual(['one'])
  })

  it('stops at a wrapper that is painted', () => {
    mount('<section id="page"><div id="card"><p id="one">One</p></div></section>')
    const read = readerFor({ card: { backgroundColor: 'rgb(255, 255, 255)' } })
    expect(idsOf(promotionChain(at('one'), read))).toEqual(['one'])
  })

  it('stops at a tag that is not a div', () => {
    mount('<section id="page"><aside id="side"><p id="one">One</p></aside></section>')
    expect(idsOf(promotionChain(at('one'), readerFor()))).toEqual(['one'])
  })
})

describe('inspectGroup', () => {
  it('takes two contiguous siblings as they are', () => {
    mount('<section id="page"><p id="one">One</p><p id="two">Two</p><p id="three">Three</p></section>')
    const group = inspectGroup([at('one'), at('two')], { read: readerFor() })
    expect(group.can).toBe(true)
    expect(group.parent).toBe(at('page'))
    expect(idsOf(group.members)).toEqual(['one', 'two'])
  })

  it('returns the members in document order whatever order they came in', () => {
    mount('<section id="page"><p id="one">One</p><p id="two">Two</p></section>')
    const group = inspectGroup([at('two'), at('one')], { read: readerFor() })
    expect(idsOf(group.members)).toEqual(['one', 'two'])
  })

  it('promotes each member through its own wrappers until they share a parent', () => {
    mount(
      '<section id="page">' +
        '<div id="wrap-one"><div id="inner-one"><p id="one">One</p></div></div>' +
        '<div id="wrap-two"><p id="two">Two</p></div>' +
        '</section>',
    )
    const group = inspectGroup([at('one'), at('two')], { read: readerFor() })
    expect(group.can).toBe(true)
    expect(group.parent).toBe(at('page'))
    expect(idsOf(group.members)).toEqual(['wrap-one', 'wrap-two'])
  })

  it('promotes no further than it has to', () => {
    mount(
      '<section id="page"><div id="row">' +
        '<div id="wrap-one"><p id="one">One</p></div>' +
        '<div id="wrap-two"><p id="two">Two</p></div>' +
        '</div></section>',
    )
    const group = inspectGroup([at('one'), at('two')], { read: readerFor() })
    expect(group.parent).toBe(at('row'))
    expect(idsOf(group.members)).toEqual(['wrap-one', 'wrap-two'])
  })

  it('refuses a single element', () => {
    mount('<section id="page"><p id="one">One</p></section>')
    expect(inspectGroup([at('one')], { read: readerFor() }).can).toBe('single-selection')
  })

  it('refuses a member that holds another', () => {
    mount('<section id="page"><div id="wrap"><p id="one">One</p><p id="two">Two</p></div></section>')
    expect(inspectGroup([at('wrap'), at('one')], { read: readerFor() }).can).toBe('nested-selection')
  })

  it('refuses members that cannot reach one parent', () => {
    mount(
      '<section id="page">' +
        '<div id="card"><p id="one">One</p></div>' +
        '<p id="two">Two</p>' +
        '</section>',
    )
    const read = readerFor({ card: { paddingTop: '16px' } })
    expect(inspectGroup([at('one'), at('two')], { read }).can).toBe('mixed-parents')
  })

  it('refuses members beyond the promotion limit', () => {
    mount(`<section id="page">${nest(PROMOTION_LIMIT + 2)}<p id="tail">Tail</p></section>`)
    expect(inspectGroup([at('leaf'), at('tail')], { read: readerFor() }).can).toBe('mixed-parents')
  })

  it('refuses siblings with another block between them', () => {
    mount('<section id="page"><p id="one">One</p><p id="gap">Gap</p><p id="two">Two</p></section>')
    const group = inspectGroup([at('one'), at('two')], { read: readerFor() })
    expect(group.can).toBe('not-contiguous')
    expect(idsOf(group.members)).toEqual(['one', 'two'])
  })

  it('refuses a parent that cannot hold a dropped block', () => {
    mount('<ul id="list"><li id="one">One</li><li id="two">Two</li></ul>')
    expect(inspectGroup([at('one'), at('two')], { read: readerFor() }).can).toBe('not-a-container')
  })

  it('refuses a locked member', () => {
    mount('<section id="page"><p id="one">One</p><p id="two">Two</p></section>')
    const group = inspectGroup([at('one'), at('two')], {
      read: readerFor(),
      isLocked: (element) => element.id === 'two',
    })
    expect(group.can).toBe('locked')
  })

  it('reads the lock on the promoted member, not the one that was clicked', () => {
    mount(
      '<section id="page">' +
        '<div id="wrap-one"><p id="one">One</p></div>' +
        '<div id="wrap-two"><p id="two">Two</p></div>' +
        '</section>',
    )
    const group = inspectGroup([at('one'), at('two')], {
      read: readerFor(),
      isLocked: (element) => element.id === 'wrap-two',
    })
    expect(group.can).toBe('locked')
  })
})
