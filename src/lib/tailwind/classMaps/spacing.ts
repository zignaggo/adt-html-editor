import { pxToSpacingToken, spacingTokenToPx } from './spacingScale'
import type { BoxValue, ClassMap } from './types'

type Side = '' | 'x' | 'y' | 't' | 'r' | 'b' | 'l'

export function applySide(box: BoxValue, side: Side, px: number): void {
  switch (side) {
    case '':
      box.t = box.r = box.b = box.l = px
      break
    case 'x':
      box.l = box.r = px
      break
    case 'y':
      box.t = box.b = px
      break
    case 't':
      box.t = px
      break
    case 'r':
      box.r = px
      break
    case 'b':
      box.b = px
      break
    case 'l':
      box.l = px
      break
  }
}

export function isUniform(box: BoxValue): boolean {
  return box.t === box.r && box.r === box.b && box.b === box.l
}

export function isAxisPair(box: BoxValue): boolean {
  return box.t === box.b && box.l === box.r
}

function makeBoxClassMap(prefix: 'p' | 'm'): ClassMap<BoxValue> {
  const pattern = new RegExp(`^-?${prefix}([xytrbl]?)-(.+)$`)

  return {
    matches: (className) => pattern.test(className),
    fromClasses(classes) {
      let result: BoxValue | null = null
      for (const className of classes) {
        const match = className.match(pattern)
        if (!match) continue
        const px = spacingTokenToPx(match[2])
        if (px === null) continue
        result ??= { t: 0, r: 0, b: 0, l: 0 }
        applySide(result, match[1] as Side, className.startsWith('-') ? -px : px)
      }
      return result
    },
    toClasses(value) {
      const { t, r, b, l } = value
      if (isUniform(value)) return [signed(prefix, t)]
      if (isAxisPair(value)) return [signed(`${prefix}x`, l), signed(`${prefix}y`, t)]
      return [signed(`${prefix}t`, t), signed(`${prefix}r`, r), signed(`${prefix}b`, b), signed(`${prefix}l`, l)]
    },
  }
}

function signed(prefix: string, px: number): string {
  const token = pxToSpacingToken(Math.abs(px))
  return px < 0 ? `-${prefix}-${token}` : `${prefix}-${token}`
}

export const paddingClassMap: ClassMap<BoxValue> = makeBoxClassMap('p')
export const marginClassMap: ClassMap<BoxValue> = makeBoxClassMap('m')
