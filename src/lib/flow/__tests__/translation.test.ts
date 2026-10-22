import { afterEach, describe, expect, it } from 'vitest'
import {
  addToComponent,
  ancestorScale,
  formatTranslation,
  isNoTranslation,
  offsetTranslation,
  parsePx,
  splitComponents,
} from '../transform/translation'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('splitComponents', () => {
  it('splits on spaces', () => {
    expect(splitComponents('12px 8px')).toEqual(['12px', '8px'])
  })

  it('keeps a calc together', () => {
    expect(splitComponents('calc(50% + 4px) 8px')).toEqual(['calc(50% + 4px)', '8px'])
  })

  it('keeps nested parentheses together', () => {
    expect(splitComponents('calc(min(10px, 2%) + 1px) 0px')).toEqual([
      'calc(min(10px, 2%) + 1px)',
      '0px',
    ])
  })
})

describe('parsePx', () => {
  it('reads plain pixels and bare zero', () => {
    expect(parsePx('12px')).toBe(12)
    expect(parsePx('-4.5px')).toBe(-4.5)
    expect(parsePx('0')).toBe(0)
  })

  it('refuses anything else', () => {
    expect(parsePx('50%')).toBeNull()
    expect(parsePx('calc(50% + 1px)')).toBeNull()
    expect(parsePx('2em')).toBeNull()
  })
})

describe('addToComponent', () => {
  it('adds to a pixel value', () => {
    expect(addToComponent('12px', 6)).toBe('18px')
    expect(addToComponent('12px', -20)).toBe('-8px')
  })

  it('folds into a calc it already carries instead of nesting', () => {
    expect(addToComponent('calc(50% + 4px)', 6)).toBe('calc(50% + 10px)')
    expect(addToComponent('calc(50% - 4px)', 6)).toBe('calc(50% + 2px)')
    expect(addToComponent('calc(50% + 4px)', -10)).toBe('calc(50% - 6px)')
  })

  it('drops the term when it cancels out', () => {
    expect(addToComponent('calc(50% + 4px)', -4)).toBe('calc(50%)')
  })

  it('wraps a unit it cannot add to', () => {
    expect(addToComponent('50%', 6)).toBe('calc(50% + 6px)')
    expect(addToComponent('2em', -3)).toBe('calc(2em - 3px)')
  })

  it('leaves a value alone when there is nothing to add', () => {
    expect(addToComponent('50%', 0)).toBe('50%')
  })
})

describe('formatTranslation', () => {
  it('drops a zero second axis', () => {
    expect(formatTranslation('12px', '0px')).toBe('12px')
  })

  it('keeps both when the second is set', () => {
    expect(formatTranslation('12px', '8px')).toBe('12px 8px')
  })
})

describe('offsetTranslation', () => {
  it('starts from nothing', () => {
    expect(offsetTranslation(undefined, 10, 4)).toBe('10px 4px')
  })

  it('adds to what is declared', () => {
    expect(offsetTranslation('10px 4px', 5, -4)).toBe('15px')
  })

  it('keeps a percentage expression', () => {
    expect(offsetTranslation('50% 0px', 8, 0)).toBe('calc(50% + 8px)')
  })

  it('collapses back to none at the origin', () => {
    expect(offsetTranslation('10px 4px', -10, -4)).toBe('none')
  })
})

describe('isNoTranslation', () => {
  it('recognises every way of saying nothing', () => {
    expect(isNoTranslation('none')).toBe(true)
    expect(isNoTranslation('0px 0px')).toBe(true)
    expect(isNoTranslation('')).toBe(true)
    expect(isNoTranslation('1px')).toBe(false)
  })
})

describe('ancestorScale', () => {
  function tree(transform?: string) {
    const root = document.createElement('div')
    const middle = document.createElement('div')
    const child = document.createElement('div')
    if (transform) middle.style.transform = transform
    middle.appendChild(child)
    root.appendChild(middle)
    document.body.appendChild(root)
    return { root, child }
  }

  it('is 1 with nothing in the way', () => {
    const { root, child } = tree()
    expect(ancestorScale(child, root)).toBe(1)
  })

  it('refuses a rotated ancestor', () => {
    const { root, child } = tree('matrix(0.7071, 0.7071, -0.7071, 0.7071, 0, 0)')
    expect(ancestorScale(child, root)).toBeNull()
  })

  it('refuses a non-uniform scale', () => {
    const { root, child } = tree('matrix(2, 0, 0, 1, 0, 0)')
    expect(ancestorScale(child, root)).toBeNull()
  })

  it('refuses 3D', () => {
    const { root, child } = tree('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)')
    expect(ancestorScale(child, root)).toBeNull()
  })

  it('multiplies a uniform scale', () => {
    const { root, child } = tree('matrix(0.5, 0, 0, 0.5, 0, 0)')
    expect(ancestorScale(child, root)).toBeCloseTo(0.5)
  })
})
