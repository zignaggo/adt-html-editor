import { makeColorClassMap } from './color'
import { keywordClassMap, lastMatch, parseArbitraryLength, type ClassMap } from './types'

export const FONT_FAMILY_VALUES = ['sans', 'serif', 'mono'] as const
export const fontFamilyClassMap: ClassMap<string> = keywordClassMap('font', FONT_FAMILY_VALUES)

export const FONT_WEIGHT_VALUES = [
  'thin',
  'extralight',
  'light',
  'normal',
  'medium',
  'semibold',
  'bold',
  'extrabold',
  'black',
] as const
export const fontWeightClassMap: ClassMap<string> = keywordClassMap('font', FONT_WEIGHT_VALUES)

const FONT_SIZE_TOKENS: ReadonlyArray<readonly [string, number]> = [
  ['xs', 12],
  ['sm', 14],
  ['base', 16],
  ['lg', 18],
  ['xl', 20],
  ['2xl', 24],
  ['3xl', 30],
  ['4xl', 36],
  ['5xl', 48],
  ['6xl', 60],
  ['7xl', 72],
  ['8xl', 96],
  ['9xl', 128],
]
const FONT_SIZE_TOKEN_TO_PX = new Map<string, number>(FONT_SIZE_TOKENS)
const FONT_SIZE_PX_TO_TOKEN = new Map<number, string>(FONT_SIZE_TOKENS.map(([token, px]) => [px, token]))

export type TokenChoice = { label: string; value: number }

export const FONT_SIZE_TOKENS_LIST: readonly TokenChoice[] = FONT_SIZE_TOKENS.map(([label, value]) => ({
  label,
  value,
}))

const FONT_SIZE_PATTERN = /^text-(xs|sm|base|lg|xl|[2-9]xl|\[[\d.]+(?:px|rem|em)\])$/
const LEADING_PATTERN = /^leading-(none|tight|snug|normal|relaxed|loose|\d+|\[[\d.]+(?:px|rem)?\])$/

function readFontSize(className: string): number | null {
  const match = className.match(FONT_SIZE_PATTERN)
  if (!match) return null
  const named = FONT_SIZE_TOKEN_TO_PX.get(match[1])
  if (named !== undefined) return named
  const arbitrary = parseArbitraryLength(match[1], ['px', 'rem', 'em'])
  if (!arbitrary) return null
  return arbitrary.unit === 'px' ? arbitrary.value : arbitrary.value * 16
}

export const fontSizeClassMap: ClassMap<number> = {
  matches: (className) => FONT_SIZE_PATTERN.test(className) || LEADING_PATTERN.test(className),
  fromClasses: (classes) => lastMatch(classes, readFontSize),
  toClasses(value) {
    if (!Number.isFinite(value) || value <= 0) return []
    const token = FONT_SIZE_PX_TO_TOKEN.get(value)
    return [token ? `text-${token}` : `text-[${value}px]`]
  },
}

export const TEXT_ALIGN_VALUES = ['left', 'center', 'right', 'justify', 'start', 'end'] as const
export const textAlignClassMap: ClassMap<string> = keywordClassMap('text', TEXT_ALIGN_VALUES)

const LEADING_TOKENS: ReadonlyArray<readonly [string, number]> = [
  ['none', 1],
  ['tight', 1.25],
  ['snug', 1.375],
  ['normal', 1.5],
  ['relaxed', 1.625],
  ['loose', 2],
]
const LEADING_TOKEN_TO_VALUE = new Map<string, number>(LEADING_TOKENS)
const LEADING_VALUE_TO_TOKEN = new Map<number, string>(LEADING_TOKENS.map(([token, value]) => [value, token]))

function readLeading(className: string): number | null {
  const match = className.match(LEADING_PATTERN)
  if (!match) return null
  const named = LEADING_TOKEN_TO_VALUE.get(match[1])
  if (named !== undefined) return named
  const arbitrary = match[1].match(/^\[([\d.]+)\]$/)
  if (!arbitrary) return null
  const value = Number(arbitrary[1])
  return Number.isFinite(value) ? value : null
}

export const lineHeightClassMap: ClassMap<number> = {
  matches: (className) => LEADING_PATTERN.test(className),
  fromClasses: (classes) => lastMatch(classes, readLeading),
  toClasses(value) {
    if (!Number.isFinite(value) || value <= 0) return []
    const token = LEADING_VALUE_TO_TOKEN.get(value)
    return [token ? `leading-${token}` : `leading-[${value}]`]
  },
}

const DECORATION_TOKENS = new Set(['italic', 'not-italic', 'underline', 'line-through', 'no-underline'])
const COMBINED_DECORATION = '[text-decoration-line:underline_line-through]'

export const textDecorationClassMap: ClassMap<string[]> = {
  matches: (className) => DECORATION_TOKENS.has(className) || className === COMBINED_DECORATION,
  fromClasses(classes) {
    const out: string[] = []
    let underline = false
    let strike = false
    for (const className of classes) {
      if (className === 'italic') out.push('italic')
      else if (className === 'underline') underline = true
      else if (className === 'line-through') strike = true
      else if (className === COMBINED_DECORATION) underline = strike = true
    }
    if (underline) out.push('underline')
    if (strike) out.push('strike')
    return out.length > 0 ? out : null
  },
  toClasses(value) {
    const out: string[] = []
    if (value.includes('italic')) out.push('italic')
    const underline = value.includes('underline')
    const strike = value.includes('strike')
    if (underline && strike) out.push(COMBINED_DECORATION)
    else if (underline) out.push('underline')
    else if (strike) out.push('line-through')
    return out
  },
}

export const textColorClassMap = makeColorClassMap('text')
