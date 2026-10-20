import { describe, expect, it } from 'vitest'
import {
  alignClasses,
  alignFromThirds,
  clampSpacePx,
  clampWidthPercent,
  spaceClasses,
  widthClasses,
  widthPreview,
} from '../gestures/flowWrite'
import { BASE_TARGET, type StyleTarget } from '../../tailwind/variants'

const MOBILE: StyleTarget = { breakpoint: 'mobile', state: null }
const NO_OPTIONS = { grid: false, blockify: false }

describe('alignFromThirds', () => {
  it('splits the parent into thirds', () => {
    expect(alignFromThirds(10, 0, 300)).toBe('left')
    expect(alignFromThirds(150, 0, 300)).toBe('center')
    expect(alignFromThirds(290, 0, 300)).toBe('right')
  })

  it('falls back to left without a parent width', () => {
    expect(alignFromThirds(10, 0, 0)).toBe('left')
  })
})

describe('alignClasses', () => {
  it('writes text alignment for text', () => {
    expect(alignClasses([], 'center', 'text', BASE_TARGET, NO_OPTIONS)).toEqual(['text-center'])
  })

  it('replaces the auto margins for a box', () => {
    expect(alignClasses(['ml-auto', 'p-4'], 'center', 'box', BASE_TARGET, NO_OPTIONS)).toEqual([
      'p-4',
      'mx-auto',
    ])
  })

  it('adds justify-self inside a grid', () => {
    const next = alignClasses([], 'right', 'box', BASE_TARGET, { grid: true, blockify: false })
    expect(next).toEqual(['ml-auto', 'justify-self-end'])
  })

  it('blockifies an inline element', () => {
    const next = alignClasses(['inline'], 'left', 'box', BASE_TARGET, { grid: false, blockify: true })
    expect(next).toEqual(['mr-auto', 'block'])
  })
})

describe('widthClasses', () => {
  it('writes an arbitrary percentage the inspector can read back', () => {
    expect(widthClasses([], 37, false, BASE_TARGET)).toEqual([
      'w-[37%]',
      'max-w-full',
      'min-w-0',
      'box-border',
    ])
  })

  it('uses w-full at a hundred percent', () => {
    expect(widthClasses([], 100, false, BASE_TARGET)[0]).toBe('w-full')
  })

  it('frees the height of an image', () => {
    const next = widthClasses([], 50, true, BASE_TARGET)
    expect(next).toContain('h-auto')
    expect(next).toContain('max-h-none')
  })

  it('scopes the write to the active breakpoint', () => {
    expect(widthClasses(['w-1/2'], 40, false, MOBILE)).toEqual([
      'w-1/2',
      'max-sm:w-[40%]',
      'max-sm:max-w-full',
      'max-sm:min-w-0',
      'max-sm:box-border',
    ])
  })

  it('clamps to the allowed range', () => {
    expect(clampWidthPercent(2)).toBe(10)
    expect(clampWidthPercent(180)).toBe(100)
  })

  it('previews the same values inline', () => {
    expect(widthPreview(37, false)).toMatchObject({ width: '37%', 'max-width': '100%' })
  })
})

describe('spaceClasses', () => {
  it('uses a scale token when the value is on the scale', () => {
    expect(spaceClasses([], 24, BASE_TARGET)).toEqual(['mb-6'])
  })

  it('falls back to an arbitrary value off the scale', () => {
    expect(spaceClasses([], 52, BASE_TARGET)).toEqual(['mb-[52px]'])
  })

  it('rewrites a shorthand that also set the bottom margin', () => {
    expect(spaceClasses(['my-4'], 8, BASE_TARGET)).toEqual(['mt-4', 'mb-2'])
    expect(spaceClasses(['m-4'], 8, BASE_TARGET)).toEqual(['mt-4', 'mr-4', 'ml-4', 'mb-2'])
  })

  it('steps in fours and stops at the maximum', () => {
    expect(clampSpacePx(13)).toBe(12)
    expect(clampSpacePx(-20)).toBe(0)
    expect(clampSpacePx(500)).toBe(96)
  })
})
