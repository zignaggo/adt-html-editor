import { pxToSpacingToken, spacingTokenToPx } from './spacingScale'
import { lastMatch, parseArbitraryLength, type ClassMap, type UnitValue } from './types'

export const KEYWORD_UNITS: ReadonlySet<string> = new Set([
  'auto',
  'none',
  'min',
  'max',
  'fit',
  'full',
  'screen',
])

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function parseSuffix(suffix: string, keywords: readonly string[]): UnitValue | null {
  if (keywords.includes(suffix)) return { value: suffix, unit: suffix }
  if (suffix === 'full') return { value: '100', unit: '%' }
  const px = spacingTokenToPx(suffix)
  if (px !== null) return { value: String(px), unit: 'px' }
  const fraction = suffix.match(/^(\d+)\/(\d+)$/)
  if (fraction) {
    const numerator = Number(fraction[1])
    const denominator = Number(fraction[2])
    if (denominator !== 0) return { value: String(round2((numerator / denominator) * 100)), unit: '%' }
  }
  const arbitrary = parseArbitraryLength(suffix, ['px', 'rem', '%', 'vw', 'vh'])
  if (!arbitrary) return null
  if (arbitrary.unit === 'rem') return { value: String(arbitrary.value * 16), unit: 'px' }
  return { value: String(arbitrary.value), unit: arbitrary.unit }
}

export function makeDimensionClassMap(prefix: string, keywords: readonly string[]): ClassMap<UnitValue> {
  const read = (className: string): UnitValue | null => {
    if (!className.startsWith(`${prefix}-`)) return null
    return parseSuffix(className.slice(prefix.length + 1), keywords)
  }

  return {
    matches: (className) => className.startsWith(`${prefix}-`),
    fromClasses: (classes) => lastMatch(classes, read),
    toClasses(value) {
      if (keywords.includes(value.unit)) return [`${prefix}-${value.unit}`]
      const raw = value.value.trim() === '' ? '0' : value.value
      const amount = Number.parseFloat(raw)
      if (!Number.isFinite(amount)) return []
      if (value.unit === 'px') return [`${prefix}-${pxToSpacingToken(amount)}`]
      if (value.unit === '%') return [amount === 100 ? `${prefix}-full` : `${prefix}-[${amount}%]`]
      return [`${prefix}-[${amount}${value.unit}]`]
    },
  }
}

export const widthClassMap = makeDimensionClassMap('w', ['auto', 'screen', 'fit', 'min', 'max'])
export const heightClassMap = makeDimensionClassMap('h', ['auto', 'screen', 'fit', 'min', 'max'])
export const minWidthClassMap = makeDimensionClassMap('min-w', ['auto', 'fit', 'min', 'max'])
export const minHeightClassMap = makeDimensionClassMap('min-h', ['auto', 'screen', 'fit', 'min', 'max'])
export const maxWidthClassMap = makeDimensionClassMap('max-w', ['none', 'fit', 'min', 'max'])
export const maxHeightClassMap = makeDimensionClassMap('max-h', ['none', 'screen', 'fit', 'min', 'max'])
