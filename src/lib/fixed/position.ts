import { formatInlineStyle, parseInlineStyle } from '../style/adapter'
import { roundTo, type Point } from './geometry'

const PX = /^(-?\d+(?:\.\d+)?)px$/

function pxValue(value: string | undefined): number | null {
  if (!value) return null
  const match = PX.exec(value.trim())
  return match ? Number(match[1]) : null
}

export function positionDeclarations(
  style: string | undefined,
  x: number,
  y: number,
  precision: number,
): string {
  const declarations = parseInlineStyle(style ?? '')
  declarations.set('position', 'absolute')
  declarations.set('left', `${roundTo(x, precision)}px`)
  declarations.set('top', `${roundTo(y, precision)}px`)
  declarations.delete('right')
  declarations.delete('bottom')
  return formatInlineStyle(declarations)
}

export function sizeDeclarations(
  style: string | undefined,
  width: number | null,
  height: number | null,
  precision: number,
): string {
  const declarations = parseInlineStyle(style ?? '')
  if (width !== null) declarations.set('width', `${roundTo(width, precision)}px`)
  if (height !== null) declarations.set('height', `${roundTo(height, precision)}px`)
  return formatInlineStyle(declarations)
}

export function withDeclarations(style: string | undefined, extra: Map<string, string>): string {
  const declarations = parseInlineStyle(style ?? '')
  for (const [name, value] of extra) {
    if (!declarations.has(name)) declarations.set(name, value)
  }
  return formatInlineStyle(declarations)
}

export function hasFrozenPosition(style: string | undefined): boolean {
  const declarations = parseInlineStyle(style ?? '')
  return (
    pxValue(declarations.get('left')) !== null &&
    pxValue(declarations.get('top')) !== null &&
    !declarations.has('right') &&
    !declarations.has('bottom')
  )
}

export function readDeclaredPosition(style: string | undefined): Point | null {
  if (!hasFrozenPosition(style)) return null
  const declarations = parseInlineStyle(style ?? '')
  return { x: pxValue(declarations.get('left')) ?? 0, y: pxValue(declarations.get('top')) ?? 0 }
}
