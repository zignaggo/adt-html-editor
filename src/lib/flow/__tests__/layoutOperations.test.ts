import { describe, expect, it } from 'vitest'
import { BASE_TARGET, MOBILE_TARGET } from '../../tailwind/variants'
import {
  classFamilies,
  inlinePropertiesOf,
  updateLayout,
  LAYOUT_FAMILIES,
} from '../layout/layoutOperations'
import {
  canCentreContents,
  layoutContainerOf,
  rowChildEdits,
  rowContainerEdits,
  widthShareOf,
  WIDE_SHARE,
} from '../layout/layoutPresets'

const layout = classFamilies(LAYOUT_FAMILIES)

function html(markup: string): HTMLElement {
  const host = document.createElement('div')
  host.innerHTML = markup
  return host.firstElementChild as HTMLElement
}

describe('updateLayout', () => {
  it('replaces a family at the target and keeps the other breakpoints', () => {
    const next = updateLayout(
      { classes: ['flex', 'flex-col', 'max-sm:flex-row', 'text-slate-600'] },
      [{ remove: layout, add: ['grid', 'grid-cols-2'] }],
      BASE_TARGET,
    )

    expect(next.classes).toEqual(['max-sm:flex-row', 'text-slate-600', 'grid', 'grid-cols-2'])
  })

  it('writes the mobile half of a preset without touching the base half', () => {
    const next = updateLayout(
      { classes: ['grid', 'grid-cols-3'] },
      [
        { remove: layout, add: ['grid', 'grid-cols-2'] },
        { remove: layout, add: ['grid-cols-1'], at: MOBILE_TARGET },
      ],
      BASE_TARGET,
    )

    expect(next.classes).toEqual(['grid', 'grid-cols-2', 'max-sm:grid-cols-1'])
  })

  it('never repeats a class it already carries', () => {
    const next = updateLayout(
      { classes: ['w-full', 'min-w-0'] },
      [{ add: ['w-full', 'min-w-0', 'max-w-full'] }],
      BASE_TARGET,
    )

    expect(next.classes).toEqual(['w-full', 'min-w-0', 'max-w-full'])
  })

  it('clears the inline declarations the new utilities would lose to', () => {
    const next = updateLayout(
      { classes: [], style: 'display: block; gap: 4px; color: red' },
      [{ add: ['flex', 'gap-6'] }],
      BASE_TARGET,
    )

    expect(next.style).toBe('color: red')
  })

  it('leaves the inline style alone when nothing equivalent is written', () => {
    const next = updateLayout(
      { classes: [], style: 'color: red' },
      [{ add: ['text-center'] }],
      BASE_TARGET,
    )

    expect(next.style).toBeUndefined()
  })

  it('reports no inline change on an element that had none', () => {
    const next = updateLayout({ classes: [] }, [{ add: ['flex'] }], BASE_TARGET)

    expect(next.style).toBeUndefined()
  })
})

describe('inlinePropertiesOf', () => {
  it('maps a utility to the declarations that would beat it', () => {
    expect(inlinePropertiesOf(['flex'])).toEqual(['display'])
    expect(inlinePropertiesOf(['grid-cols-2'])).toEqual(['grid-template-columns'])
    expect(inlinePropertiesOf(['items-center'])).toEqual(['align-items'])
    expect(inlinePropertiesOf(['gap-6'])).toEqual(['gap', 'row-gap', 'column-gap'])
    expect(inlinePropertiesOf(['w-[40%]'])).toEqual(['width'])
    expect(inlinePropertiesOf(['min-w-0'])).toEqual(['min-width'])
    expect(inlinePropertiesOf(['float-left'])).toEqual(['float'])
    expect(inlinePropertiesOf(['text-center'])).toEqual(['text-align'])
  })

  it('expands a margin shorthand into the sides it covers', () => {
    expect(inlinePropertiesOf(['m-0'])).toEqual([
      'margin',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
    ])
    expect(inlinePropertiesOf(['mb-6'])).toEqual(['margin-bottom'])
  })

  it('reads through a breakpoint prefix', () => {
    expect(inlinePropertiesOf(['max-sm:grid-cols-1'])).toEqual(['grid-template-columns'])
  })

  it('ignores a utility with no layout meaning', () => {
    expect(inlinePropertiesOf(['text-slate-600', 'rounded-lg'])).toEqual([])
  })
})

describe('row preset', () => {
  it('writes the row on the container and stacks it on a phone', () => {
    const next = updateLayout({ classes: [] }, rowContainerEdits('tops'), BASE_TARGET)

    expect(next.classes).toEqual([
      'flex',
      'flex-row',
      'justify-between',
      'items-start',
      'gap-6',
      'max-sm:flex-col',
      'max-sm:items-center',
    ])
  })

  it('lets a wide child size itself and pins a narrow one to its share', () => {
    const wide = updateLayout({ classes: [] }, rowChildEdits(0.8), BASE_TARGET)
    const narrow = updateLayout({ classes: [] }, rowChildEdits(0.4), BASE_TARGET)

    expect(wide.classes).toEqual(['w-auto', 'min-w-0', 'max-w-full', 'shrink', 'max-sm:w-full'])
    expect(narrow.classes[0]).toBe('w-[40%]')
    expect(narrow.classes).toContain('max-sm:w-full')
  })

  it('treats the threshold itself as wide', () => {
    const next = updateLayout({ classes: [] }, rowChildEdits(WIDE_SHARE), BASE_TARGET)

    expect(next.classes).toContain('w-auto')
  })

  it('drops the width the child carried from its old parent', () => {
    const next = updateLayout({ classes: ['w-1/2', 'float-left', 'rounded-lg'] }, rowChildEdits(0.5), BASE_TARGET)

    expect(next.classes).not.toContain('w-1/2')
    expect(next.classes).not.toContain('float-left')
    expect(next.classes).toContain('rounded-lg')
  })
})

describe('widthShareOf', () => {
  it('reads the whole width when the container has none to measure', () => {
    const element = html('<div></div>')
    expect(widthShareOf(element, 0)).toBe(1)
  })
})

describe('canCentreContents', () => {
  it('takes one to four paragraphs or headings', () => {
    const children = (markup: string) => [...html(markup).children] as HTMLElement[]

    expect(canCentreContents(children('<div><p>a</p></div>'))).toBe(true)
    expect(canCentreContents(children('<div><h2>a</h2><p>b</p></div>'))).toBe(true)
    expect(canCentreContents(children('<div></div>'))).toBe(false)
    expect(canCentreContents(children('<div><p>a</p><div>b</div></div>'))).toBe(false)
    expect(
      canCentreContents(children('<div><p>a</p><p>b</p><p>c</p><p>d</p><p>e</p></div>')),
    ).toBe(false)
  })
})

describe('layoutContainerOf', () => {
  it('descends through single-child div wrappers', () => {
    const root = html('<section><div id="a"><div id="b"><p>x</p><p>y</p></div></div></section>')
    document.body.append(root)

    expect(layoutContainerOf(root).id).toBe('b')
    root.remove()
  })

  it('stops at a wrapper whose only child is not a div', () => {
    const root = html('<section><p id="only">x</p></section>')
    document.body.append(root)

    expect(layoutContainerOf(root).tagName).toBe('SECTION')
    root.remove()
  })
})
