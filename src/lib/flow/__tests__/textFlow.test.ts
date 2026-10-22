import { afterEach, describe, expect, it } from 'vitest'
import type { StyleReader } from '../capabilities'
import { groupTextFlow, isLayoutWrapper, planTextFlow, textWrapperClasses } from '../layout/textFlow'

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
  marginBottom: '0px',
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

afterEach(() => {
  document.body.replaceChildren()
})

describe('isLayoutWrapper', () => {
  it('walks through a plain div', () => {
    mount('<div id="wrap"></div>')
    expect(isLayoutWrapper(at('wrap'), readerFor())).toBe(true)
  })

  it('stops at anything that is not a div', () => {
    mount('<section id="wrap"></section>')
    expect(isLayoutWrapper(at('wrap'), readerFor())).toBe(false)
  })

  it.each([
    ['background', { backgroundColor: 'rgb(255, 255, 255)' }],
    ['background image', { backgroundImage: 'url(a.png)' }],
    ['padding', { paddingLeft: '24px' }],
    ['border', { borderStyle: 'solid', borderTopWidth: '1px' }],
    ['border on one side', { borderStyle: 'solid', borderLeftWidth: '4px' }],
    ['overflow', { overflow: 'hidden' }],
  ])('treats a div with a %s as a barrier', (_name, declaration) => {
    mount('<div id="wrap"></div>')
    expect(isLayoutWrapper(at('wrap'), readerFor({ wrap: declaration }))).toBe(false)
  })

  it('walks through the border style a reset leaves on every element', () => {
    mount('<div id="wrap"></div>')
    const read = readerFor({ wrap: { borderStyle: 'solid', borderTopWidth: '0px' } })
    expect(isLayoutWrapper(at('wrap'), read)).toBe(true)
  })

  it.each(['role="group"', 'data-activity-item', 'data-section-id="s1"'])(
    'treats a div marked with %s as a barrier',
    (attribute) => {
      mount(`<div id="wrap" ${attribute}></div>`)
      expect(isLayoutWrapper(at('wrap'), readerFor())).toBe(false)
    },
  )
})

describe('planTextFlow', () => {
  const read = readerFor()

  it('takes the paragraphs beside the object', () => {
    mount('<div id="box"><figure id="obj"></figure><p id="one">a</p><p id="two">b</p></div>')
    const plan = planTextFlow(at('obj'), 'left', read)

    expect(plan?.kind).toBe('container')
    expect(plan?.container.id).toBe('box')
    expect(plan?.anchor.id).toBe('one')
    expect(plan?.createRoot).toBe(false)
    expect(plan?.texts.map((text) => text.id)).toEqual(['one', 'two'])
  })

  it('climbs out of a plain wrapper to reach the surrounding text', () => {
    mount('<div id="root"><div id="wrap"><figure id="obj"></figure></div><p id="one">a</p></div>')
    const plan = planTextFlow(at('obj'), 'left', read)

    expect(plan?.kind).toBe('surrounding')
    expect(plan?.container.id).toBe('root')
    expect(plan?.anchor.id).toBe('one')
  })

  it('takes the text inside a sibling wrapper along', () => {
    mount(
      '<div id="root"><figure id="obj"></figure>' +
        '<div id="col"><p id="one">a</p></div></div>',
    )
    const plan = planTextFlow(at('obj'), 'left', read)

    expect(plan?.anchor.id).toBe('col')
    expect(plan?.wrappers.map((wrapper) => wrapper.id)).toEqual(['col'])
    expect(plan?.texts.map((text) => text.id)).toEqual(['one'])
  })

  it.each([
    ['a card', 'id="wrap" style="x"', { wrap: { backgroundColor: 'rgb(255, 255, 255)' } }],
    ['an activity', 'id="wrap" data-activity-item', {}],
  ])('refuses to climb out of %s', (_name, attributes, overrides) => {
    mount(`<div id="root"><div ${attributes}><figure id="obj"></figure></div><p id="one">a</p></div>`)

    expect(planTextFlow(at('obj'), 'left', readerFor(overrides))).toBeNull()
  })

  it('selecting the inner container still reaches the text outside it', () => {
    mount('<div id="root"><div id="grid"><figure id="obj"></figure></div><p id="one">a</p></div>')
    const plan = planTextFlow(at('grid'), 'left', read)

    expect(plan?.kind).toBe('selected')
    expect(plan?.object.id).toBe('obj')
    expect(plan?.container.id).toBe('root')
  })

  it('makes its own flow root when the container holds something else', () => {
    mount('<div id="box"><figure id="obj"></figure><p id="one">a</p><ul id="list"></ul></div>')
    const plan = planTextFlow(at('obj'), 'left', read)

    expect(plan?.createRoot).toBe(true)
    expect(plan?.members.map((member) => member.id)).toEqual(['one'])
  })

  it('refuses when there is no text to wrap', () => {
    mount('<div id="box"><figure id="obj"></figure><ul id="list"></ul></div>')

    expect(planTextFlow(at('obj'), 'left', read)).toBeNull()
  })

  it('refuses when the selection holds nothing text can wrap around', () => {
    mount('<div id="box"><p id="one">a</p><p id="two">b</p></div>')

    expect(planTextFlow(at('box'), 'left', read)).toBeNull()
  })

  it('spaces only the paragraphs that have no bottom margin', () => {
    mount('<div id="box"><figure id="obj"></figure><p id="one">a</p><p id="two">b</p></div>')
    const plan = planTextFlow(at('obj'), 'left', readerFor({ two: { marginBottom: '24px' } }))

    expect(plan?.needSpacing.map((text) => text.id)).toEqual(['one'])
  })

  it('an explicit anchor pins the plan to that paragraph', () => {
    mount('<div id="box"><figure id="obj"></figure><p id="one">a</p><p id="two">b</p></div>')
    const plan = planTextFlow(at('obj'), 'right', read, at('two'))

    expect(plan?.kind).toBe('container')
    expect(plan?.anchor.id).toBe('two')
    expect(plan?.side).toBe('right')
  })
})

describe('groupTextFlow', () => {
  const read = readerFor()

  it('wraps the selected paragraphs around the selected object', () => {
    mount('<div id="box"><figure id="obj"></figure><p id="one">a</p><p id="two">b</p></div>')
    const plan = groupTextFlow([at('obj'), at('one'), at('two')], 'left', read)

    expect(plan?.kind).toBe('group')
    expect(plan?.object.id).toBe('obj')
    expect(plan?.container.id).toBe('box')
    expect(plan?.anchor.id).toBe('one')
    expect(plan?.createRoot).toBe(false)
    expect(plan?.texts.map((text) => text.id)).toEqual(['one', 'two'])
  })

  it('makes its own flow root when the container holds more than the group', () => {
    mount(
      '<div id="box"><figure id="obj"></figure><p id="one">a</p><p id="two">b</p></div>',
    )
    const plan = groupTextFlow([at('obj'), at('one')], 'left', read)

    expect(plan?.createRoot).toBe(true)
    expect(plan?.members.map((member) => member.id)).toEqual(['one'])
    expect(plan?.texts.map((text) => text.id)).toEqual(['one'])
  })

  it('leaves a member that is neither text nor wrapper out of the root', () => {
    mount(
      '<div id="box"><figure id="obj"></figure><p id="one">a</p><ul id="list"></ul></div>',
    )
    const plan = groupTextFlow([at('obj'), at('one'), at('list')], 'left', read)

    expect(plan?.createRoot).toBe(true)
    expect(plan?.members.map((member) => member.id)).toEqual(['one'])
  })

  it('takes the text inside a selected wrapper along', () => {
    mount('<div id="box"><figure id="obj"></figure><div id="col"><p id="one">a</p></div></div>')
    const plan = groupTextFlow([at('obj'), at('col')], 'left', read)

    expect(plan?.anchor.id).toBe('col')
    expect(plan?.wrappers.map((wrapper) => wrapper.id)).toEqual(['col'])
    expect(plan?.texts.map((text) => text.id)).toEqual(['one'])
  })

  it('finds the object inside the member that holds it', () => {
    mount('<div id="box"><div id="frame"><figure id="obj"></figure></div><p id="one">a</p></div>')
    const plan = groupTextFlow([at('frame'), at('one')], 'right', read)

    expect(plan?.object.id).toBe('obj')
    expect(plan?.side).toBe('right')
    expect(plan?.members.map((member) => member.id)).toEqual(['one'])
  })

  it('spaces only the paragraphs that have no bottom margin', () => {
    mount('<div id="box"><figure id="obj"></figure><p id="one">a</p><p id="two">b</p></div>')
    const plan = groupTextFlow(
      [at('obj'), at('one'), at('two')],
      'left',
      readerFor({ two: { marginBottom: '24px' } }),
    )

    expect(plan?.needSpacing.map((text) => text.id)).toEqual(['one'])
  })

  it('refuses a group with nothing text can wrap around', () => {
    mount('<div id="box"><p id="one">a</p><p id="two">b</p></div>')

    expect(groupTextFlow([at('one'), at('two')], 'left', read)).toBeNull()
  })

  it('refuses a group with no text in it', () => {
    mount('<div id="box"><figure id="obj"></figure><ul id="list"></ul></div>')

    expect(groupTextFlow([at('obj'), at('list')], 'left', read)).toBeNull()
  })

  it('refuses members that do not share a parent', () => {
    mount('<div id="box"><div id="col"><figure id="obj"></figure></div><p id="one">a</p></div>')

    expect(groupTextFlow([at('obj'), at('one')], 'left', read)).toBeNull()
  })

  it('refuses a group of one', () => {
    mount('<div id="box"><figure id="obj"></figure><p id="one">a</p></div>')

    expect(groupTextFlow([at('obj')], 'left', read)).toBeNull()
  })
})

describe('textWrapperClasses', () => {
  it('lets the wrapper go back to a plain block', () => {
    expect(textWrapperClasses(['grid', 'grid-cols-2', 'w-1/2', 'gap-4', 'text-slate-600'])).toEqual([
      'text-slate-600',
      'block',
      'w-auto',
      'min-w-0',
      'max-w-full',
    ])
  })
})
