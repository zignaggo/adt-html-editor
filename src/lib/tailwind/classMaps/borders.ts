import { makeColorClassMap } from './color'
import { applySide, isAxisPair, isUniform } from './spacing'
import { parseArbitraryLength, type BoxValue, type ClassMap } from './types'

const BORDER_WIDTH_PATTERN = /^border(?:-([xytrbl]))?(?:-(\d+|\[[\d.]+(?:px|rem)\]))?$/

function parseWidth(size: string | undefined): number | null {
  if (size === undefined) return 1
  const plain = Number(size)
  if (Number.isFinite(plain)) return plain
  const arbitrary = parseArbitraryLength(size, ['px', 'rem'])
  if (!arbitrary) return null
  return arbitrary.unit === 'rem' ? arbitrary.value * 16 : arbitrary.value
}

function widthClass(prefix: string, px: number): string {
  if (px === 1) return prefix
  if (px === 0 || px === 2 || px === 4 || px === 8) return `${prefix}-${px}`
  return `${prefix}-[${px}px]`
}

export const borderWidthClassMap: ClassMap<BoxValue> = {
  matches: (className) => BORDER_WIDTH_PATTERN.test(className),
  fromClasses(classes) {
    let result: BoxValue | null = null
    for (const className of classes) {
      const match = className.match(BORDER_WIDTH_PATTERN)
      if (!match) continue
      const px = parseWidth(match[2])
      if (px === null) continue
      result ??= { t: 0, r: 0, b: 0, l: 0 }
      applySide(result, (match[1] ?? '') as '' | 'x' | 'y' | 't' | 'r' | 'b' | 'l', px)
    }
    return result
  },
  toClasses(value) {
    const { t, r, b, l } = value
    if (isUniform(value)) return t === 0 ? [] : [widthClass('border', t)]
    if (isAxisPair(value)) {
      const out: string[] = []
      if (l !== 0) out.push(widthClass('border-x', l))
      if (t !== 0) out.push(widthClass('border-y', t))
      return out
    }
    const out: string[] = []
    if (t !== 0) out.push(widthClass('border-t', t))
    if (r !== 0) out.push(widthClass('border-r', r))
    if (b !== 0) out.push(widthClass('border-b', b))
    if (l !== 0) out.push(widthClass('border-l', l))
    return out
  },
}

const RADIUS_PATTERN =
  /^rounded(?:-(tl|tr|br|bl|t|r|b|l))?(?:-(none|xs|sm|md|lg|xl|2xl|3xl|4xl|full|\[[\d.]+(?:px|rem)\]))?$/

const RADIUS_TOKENS: ReadonlyArray<readonly [string, number]> = [
  ['none', 0],
  ['xs', 2],
  ['sm', 4],
  ['md', 6],
  ['lg', 8],
  ['xl', 12],
  ['2xl', 16],
  ['3xl', 24],
  ['4xl', 32],
  ['full', 9999],
]
const RADIUS_TOKEN_TO_PX = new Map<string, number>(RADIUS_TOKENS)
const RADIUS_PX_TO_TOKEN = new Map<number, string>(RADIUS_TOKENS.map(([token, px]) => [px, token]))

function parseRadius(size: string | undefined): number | null {
  if (size === undefined) return 4
  const named = RADIUS_TOKEN_TO_PX.get(size)
  if (named !== undefined) return named
  const arbitrary = parseArbitraryLength(size, ['px', 'rem'])
  if (!arbitrary) return null
  return arbitrary.unit === 'rem' ? arbitrary.value * 16 : arbitrary.value
}

function radiusClass(prefix: string, px: number): string {
  const token = RADIUS_PX_TO_TOKEN.get(px)
  return token ? `${prefix}-${token}` : `${prefix}-[${px}px]`
}

export const borderRadiusClassMap: ClassMap<BoxValue> = {
  matches: (className) => RADIUS_PATTERN.test(className),
  fromClasses(classes) {
    let result: BoxValue | null = null
    for (const className of classes) {
      const match = className.match(RADIUS_PATTERN)
      if (!match) continue
      const px = parseRadius(match[2])
      if (px === null) continue
      result ??= { t: 0, r: 0, b: 0, l: 0 }
      switch (match[1] ?? '') {
        case '':
          result.t = result.r = result.b = result.l = px
          break
        case 'tl':
          result.t = px
          break
        case 'tr':
          result.r = px
          break
        case 'br':
          result.b = px
          break
        case 'bl':
          result.l = px
          break
        case 't':
          result.t = result.r = px
          break
        case 'r':
          result.r = result.b = px
          break
        case 'b':
          result.b = result.l = px
          break
        case 'l':
          result.l = result.t = px
          break
      }
    }
    return result
  },
  toClasses(value) {
    const { t, r, b, l } = value
    if (isUniform(value)) return t === 0 ? [] : [radiusClass('rounded', t)]
    const out: string[] = []
    if (t !== 0) out.push(radiusClass('rounded-tl', t))
    if (r !== 0) out.push(radiusClass('rounded-tr', r))
    if (b !== 0) out.push(radiusClass('rounded-br', b))
    if (l !== 0) out.push(radiusClass('rounded-bl', l))
    return out
  },
}

export const borderColorClassMap = makeColorClassMap('border')
