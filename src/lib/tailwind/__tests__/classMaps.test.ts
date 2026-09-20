import { describe, expect, it } from 'vitest'
import {
  alignItemsClassMap,
  backgroundColorClassMap,
  borderRadiusClassMap,
  borderWidthClassMap,
  displayClassMap,
  fontSizeClassMap,
  fontWeightClassMap,
  gapClassMap,
  heightClassMap,
  lineHeightClassMap,
  marginClassMap,
  maxWidthClassMap,
  opacityClassMap,
  paddingClassMap,
  shadowClassMap,
  textDecorationClassMap,
  widthClassMap,
} from '../classMaps'
import {
  breakpointForWidth,
  cascadeOf,
  matchesTarget,
  stripVariants,
  targetOf,
  withTarget,
} from '../variants'

describe('spacing class maps', () => {
  it('reads shorthand then side overrides', () => {
    expect(paddingClassMap.fromClasses(['p-4', 'pt-2'])).toEqual({ t: 8, r: 16, b: 16, l: 16 })
    expect(paddingClassMap.fromClasses(['px-2', 'py-[13px]'])).toEqual({ t: 13, r: 8, b: 13, l: 8 })
  })

  it('writes the shortest form', () => {
    expect(paddingClassMap.toClasses({ t: 16, r: 16, b: 16, l: 16 })).toEqual(['p-4'])
    expect(paddingClassMap.toClasses({ t: 8, r: 16, b: 8, l: 16 })).toEqual(['px-4', 'py-2'])
    expect(paddingClassMap.toClasses({ t: 1, r: 2, b: 3, l: 4 })).toEqual(['pt-[1px]', 'pr-0.5', 'pb-[3px]', 'pl-1'])
  })

  it('handles negative margins', () => {
    expect(marginClassMap.fromClasses(['-mt-4'])).toEqual({ t: -16, r: 0, b: 0, l: 0 })
    expect(marginClassMap.toClasses({ t: -16, r: -16, b: -16, l: -16 })).toEqual(['-m-4'])
    expect(marginClassMap.matches('-mx-2')).toBe(true)
  })
})

describe('sizing class maps', () => {
  it('reads tokens, fractions, keywords and arbitrary values', () => {
    expect(widthClassMap.fromClasses(['w-4'])).toEqual({ value: '16', unit: 'px' })
    expect(widthClassMap.fromClasses(['w-1/2'])).toEqual({ value: '50', unit: '%' })
    expect(widthClassMap.fromClasses(['w-full'])).toEqual({ value: '100', unit: '%' })
    expect(widthClassMap.fromClasses(['w-auto'])).toEqual({ value: 'auto', unit: 'auto' })
    expect(heightClassMap.fromClasses(['h-[2rem]'])).toEqual({ value: '32', unit: 'px' })
    expect(maxWidthClassMap.fromClasses(['max-w-none'])).toEqual({ value: 'none', unit: 'none' })
  })

  it('writes tokens for scale values and arbitrary otherwise', () => {
    expect(widthClassMap.toClasses({ value: '16', unit: 'px' })).toEqual(['w-4'])
    expect(widthClassMap.toClasses({ value: '13', unit: 'px' })).toEqual(['w-[13px]'])
    expect(widthClassMap.toClasses({ value: '100', unit: '%' })).toEqual(['w-full'])
    expect(widthClassMap.toClasses({ value: '33', unit: '%' })).toEqual(['w-[33%]'])
    expect(widthClassMap.toClasses({ value: '', unit: 'px' })).toEqual(['w-0'])
    expect(maxWidthClassMap.toClasses({ value: 'none', unit: 'none' })).toEqual(['max-w-none'])
  })

  it('does not confuse w- with max-w-', () => {
    expect(widthClassMap.matches('max-w-4')).toBe(false)
    expect(maxWidthClassMap.matches('w-4')).toBe(false)
  })
})

describe('typography class maps', () => {
  it('maps font sizes and strips leading on write', () => {
    expect(fontSizeClassMap.fromClasses(['text-2xl'])).toBe(24)
    expect(fontSizeClassMap.fromClasses(['text-[1.5rem]'])).toBe(24)
    expect(fontSizeClassMap.toClasses(24)).toEqual(['text-2xl'])
    expect(fontSizeClassMap.toClasses(13)).toEqual(['text-[13px]'])
    expect(fontSizeClassMap.matches('leading-tight')).toBe(true)
    expect(fontSizeClassMap.matches('text-center')).toBe(false)
  })

  it('keeps weight and family apart', () => {
    expect(fontWeightClassMap.fromClasses(['font-mono', 'font-bold'])).toBe('bold')
    expect(fontWeightClassMap.matches('font-mono')).toBe(false)
  })

  it('combines underline and strike', () => {
    expect(textDecorationClassMap.toClasses(['underline', 'strike'])).toEqual([
      '[text-decoration-line:underline_line-through]',
    ])
    expect(textDecorationClassMap.fromClasses(['italic', '[text-decoration-line:underline_line-through]'])).toEqual([
      'italic',
      'underline',
      'strike',
    ])
  })

  it('maps leading tokens', () => {
    expect(lineHeightClassMap.fromClasses(['leading-relaxed'])).toBe(1.625)
    expect(lineHeightClassMap.toClasses(1.5)).toEqual(['leading-normal'])
    expect(lineHeightClassMap.toClasses(1.7)).toEqual(['leading-[1.7]'])
  })
})

describe('layout, appearance and border class maps', () => {
  it('maps display and gap', () => {
    expect(displayClassMap.fromClasses(['flex', 'hidden'])).toBe('hidden')
    expect(displayClassMap.toClasses('grid')).toEqual(['grid'])
    expect(alignItemsClassMap.toClasses('center')).toEqual(['items-center'])
    expect(gapClassMap.fromClasses(['gap-x-2', 'gap-4'])).toBe(16)
    expect(gapClassMap.toClasses(16)).toEqual(['gap-4'])
  })

  it('maps colours as tokens or arbitrary hex', () => {
    expect(backgroundColorClassMap.fromClasses(['bg-violet-500'])).toBe('violet-500')
    expect(backgroundColorClassMap.fromClasses(['bg-[#abc123]'])).toBe('#abc123')
    expect(backgroundColorClassMap.toClasses('#abc123')).toEqual(['bg-[#abc123]'])
    expect(backgroundColorClassMap.toClasses('transparent')).toEqual(['bg-transparent'])
    expect(backgroundColorClassMap.matches('bg-gradient-to-r')).toBe(false)
  })

  it('maps opacity and shadow', () => {
    expect(opacityClassMap.fromClasses(['opacity-50'])).toBe(50)
    expect(opacityClassMap.fromClasses(['opacity-[0.33]'])).toBe(33)
    expect(opacityClassMap.toClasses(100)).toEqual([])
    expect(opacityClassMap.toClasses(45)).toEqual(['opacity-45'])
    expect(opacityClassMap.toClasses(33)).toEqual(['opacity-[0.33]'])
    expect(shadowClassMap.fromClasses(['shadow'])).toBe('DEFAULT')
    expect(shadowClassMap.toClasses('DEFAULT')).toEqual(['shadow'])
    expect(shadowClassMap.toClasses('lg')).toEqual(['shadow-lg'])
    expect(shadowClassMap.matches('shadow-red-500')).toBe(false)
  })

  it('maps border widths per side', () => {
    expect(borderWidthClassMap.fromClasses(['border', 'border-t-2'])).toEqual({ t: 2, r: 1, b: 1, l: 1 })
    expect(borderWidthClassMap.toClasses({ t: 1, r: 1, b: 1, l: 1 })).toEqual(['border'])
    expect(borderWidthClassMap.toClasses({ t: 0, r: 0, b: 2, l: 0 })).toEqual(['border-b-2'])
    expect(borderWidthClassMap.toClasses({ t: 0, r: 0, b: 0, l: 0 })).toEqual([])
    expect(borderWidthClassMap.matches('border-red-500')).toBe(false)
  })

  it('maps radii per corner', () => {
    expect(borderRadiusClassMap.fromClasses(['rounded-lg'])).toEqual({ t: 8, r: 8, b: 8, l: 8 })
    expect(borderRadiusClassMap.fromClasses(['rounded-t-xl'])).toEqual({ t: 12, r: 12, b: 0, l: 0 })
    expect(borderRadiusClassMap.toClasses({ t: 8, r: 8, b: 8, l: 8 })).toEqual(['rounded-lg'])
    expect(borderRadiusClassMap.toClasses({ t: 8, r: 0, b: 0, l: 0 })).toEqual(['rounded-tl-lg'])
    expect(borderRadiusClassMap.toClasses({ t: 9999, r: 9999, b: 9999, l: 9999 })).toEqual(['rounded-full'])
  })
})

describe('style targets', () => {
  it('parses breakpoint and state prefixes', () => {
    expect(targetOf('p-4')).toEqual({ breakpoint: 'desktop', state: null })
    expect(targetOf('max-lg:p-4')).toEqual({ breakpoint: 'tablet', state: null })
    expect(targetOf('max-sm:hover:bg-red-500')).toEqual({ breakpoint: 'mobile', state: 'hover' })
    expect(targetOf('dark:max-lg:text-white')).toEqual({ breakpoint: 'tablet', state: 'dark' })
    expect(targetOf('md:p-4')).toBeNull()
    expect(targetOf('[text-decoration-line:underline_line-through]')).toEqual({ breakpoint: 'desktop', state: null })
    expect(targetOf('max-lg:[mask-type:luminance]')).toEqual({ breakpoint: 'tablet', state: null })
  })

  it('strips prefixes without touching arbitrary values', () => {
    expect(stripVariants('[text-decoration-line:underline_line-through]')).toBe(
      '[text-decoration-line:underline_line-through]',
    )
    expect(stripVariants('max-lg:hover:bg-[#fff]')).toBe('bg-[#fff]')
    expect(stripVariants('max-sm:p-4')).toBe('p-4')
  })

  it('matches unknown prefixes to the base target only', () => {
    expect(matchesTarget('md:p-4', { breakpoint: 'desktop', state: null })).toBe(true)
    expect(matchesTarget('md:p-4', { breakpoint: 'tablet', state: null })).toBe(false)
    expect(matchesTarget('max-lg:p-4', { breakpoint: 'tablet', state: null })).toBe(true)
  })

  it('writes desktop-first prefixes', () => {
    expect(withTarget('p-4', { breakpoint: 'desktop', state: null })).toBe('p-4')
    expect(withTarget('p-4', { breakpoint: 'tablet', state: null })).toBe('max-lg:p-4')
    expect(withTarget('p-4', { breakpoint: 'mobile', state: 'hover' })).toBe('max-sm:hover:p-4')
    expect(withTarget('p-4', { breakpoint: 'desktop', state: 'dark' })).toBe('dark:p-4')
  })

  it('cascades from the narrow breakpoint up to desktop, then drops the state', () => {
    expect(cascadeOf({ breakpoint: 'mobile', state: null })).toEqual([
      { breakpoint: 'mobile', state: null },
      { breakpoint: 'tablet', state: null },
      { breakpoint: 'desktop', state: null },
    ])
    expect(cascadeOf({ breakpoint: 'tablet', state: 'hover' })).toEqual([
      { breakpoint: 'tablet', state: 'hover' },
      { breakpoint: 'desktop', state: 'hover' },
      { breakpoint: 'tablet', state: null },
      { breakpoint: 'desktop', state: null },
    ])
  })

  it('derives the breakpoint from the canvas width', () => {
    expect(breakpointForWidth(0)).toBe('desktop')
    expect(breakpointForWidth(1280)).toBe('desktop')
    expect(breakpointForWidth(820)).toBe('tablet')
    expect(breakpointForWidth(390)).toBe('mobile')
  })
})
