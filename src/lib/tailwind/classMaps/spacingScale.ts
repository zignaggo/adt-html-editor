import { parseArbitraryLength } from './types'

const SPACING_TOKENS: ReadonlyArray<readonly [number, string]> = [
  [0, '0'],
  [2, '0.5'],
  [4, '1'],
  [6, '1.5'],
  [8, '2'],
  [10, '2.5'],
  [12, '3'],
  [14, '3.5'],
  [16, '4'],
  [20, '5'],
  [24, '6'],
  [28, '7'],
  [32, '8'],
  [36, '9'],
  [40, '10'],
  [44, '11'],
  [48, '12'],
  [56, '14'],
  [64, '16'],
  [80, '20'],
  [96, '24'],
  [112, '28'],
  [128, '32'],
  [144, '36'],
  [160, '40'],
  [176, '44'],
  [192, '48'],
  [208, '52'],
  [224, '56'],
  [240, '60'],
  [256, '64'],
  [288, '72'],
  [320, '80'],
  [384, '96'],
]

const PX_TO_TOKEN = new Map<number, string>(SPACING_TOKENS)
const TOKEN_TO_PX = new Map<string, number>(SPACING_TOKENS.map(([px, token]) => [token, px]))

export const SPACING_SCALE_PX: readonly number[] = SPACING_TOKENS.map(([px]) => px)

export function pxToSpacingToken(px: number): string {
  return PX_TO_TOKEN.get(px) ?? `[${px}px]`
}

export function spacingTokenToPx(token: string): number | null {
  const fromTable = TOKEN_TO_PX.get(token)
  if (fromTable !== undefined) return fromTable
  const arbitrary = parseArbitraryLength(token, ['px', 'rem'])
  if (!arbitrary) return null
  return arbitrary.unit === 'rem' ? arbitrary.value * 16 : arbitrary.value
}
