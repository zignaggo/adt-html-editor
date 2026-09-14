import { formatInlineStyle, parseInlineStyle } from '../../style/adapter'
import { roundTo } from '../geometry'

export type TransformFunction = { name: string; args: string }

const FUNCTION = /([a-zA-Z0-9]+)\(([^)]*)\)/g
const ANGLE = /^(-?\d*\.?\d+)(deg|rad|turn|grad)?$/
const ANGLE_PRECISION = 0.1

export function parseTransform(value: string | undefined): TransformFunction[] {
  const out: TransformFunction[] = []
  if (!value || value.trim() === 'none') return out
  for (const match of value.matchAll(FUNCTION)) {
    out.push({ name: match[1].toLowerCase(), args: match[2].trim() })
  }
  return out
}

export function formatTransform(functions: TransformFunction[]): string {
  return functions.map((fn) => `${fn.name}(${fn.args})`).join(' ')
}

export function angleToDegrees(value: string): number | null {
  const match = ANGLE.exec(value.trim())
  if (!match) return null
  const amount = Number(match[1])
  switch (match[2]) {
    case 'rad':
      return (amount * 180) / Math.PI
    case 'turn':
      return amount * 360
    case 'grad':
      return amount * 0.9
    default:
      return amount
  }
}

export function normalizeAngle(degrees: number): number {
  let angle = degrees % 360
  if (angle > 180) angle -= 360
  if (angle <= -180) angle += 360
  return angle === 0 ? 0 : angle
}

export function formatAngle(degrees: number): number {
  return roundTo(normalizeAngle(degrees), ANGLE_PRECISION)
}

export type Decomposed = { rotation: number; scaleX: number; scaleY: number }

export function decomposeMatrix(matrix: string): Decomposed | null {
  const [fn] = parseTransform(matrix)
  if (!fn) return null
  const values = fn.args.split(',').map((part) => Number(part.trim()))
  if (values.some((value) => !Number.isFinite(value))) return null
  let components: [number, number, number, number]
  if (fn.name === 'matrix' && values.length === 6) {
    components = [values[0], values[1], values[2], values[3]]
  } else if (fn.name === 'matrix3d' && values.length === 16) {
    components = [values[0], values[1], values[4], values[5]]
  } else {
    return null
  }
  const [a, b, c, d] = components
  return {
    rotation: normalizeAngle((Math.atan2(b, a) * 180) / Math.PI),
    scaleX: Math.hypot(a, b),
    scaleY: Math.hypot(c, d),
  }
}

export function rotationIn(transform: string | undefined): number | null {
  let total: number | null = null
  for (const fn of parseTransform(transform)) {
    if (fn.name === 'rotate' || fn.name === 'rotatez') {
      const degrees = angleToDegrees(fn.args)
      if (degrees !== null) total = (total ?? 0) + degrees
    } else if (fn.name === 'matrix' || fn.name === 'matrix3d') {
      const decomposed = decomposeMatrix(`${fn.name}(${fn.args})`)
      if (decomposed) total = (total ?? 0) + decomposed.rotation
    }
  }
  return total === null ? null : normalizeAngle(total)
}

export function inlineRotation(style: string | undefined): number {
  return rotationIn(parseInlineStyle(style ?? '').get('transform')) ?? 0
}

export function withRotation(style: string | undefined, degrees: number): string {
  const declarations = parseInlineStyle(style ?? '')
  const angle = formatAngle(degrees)
  const functions = parseTransform(declarations.get('transform')).filter(
    (fn) => fn.name !== 'rotate' && fn.name !== 'rotatez',
  )
  if (angle !== 0) functions.push({ name: 'rotate', args: `${angle}deg` })
  if (functions.length === 0) declarations.delete('transform')
  else declarations.set('transform', formatTransform(functions))
  return formatInlineStyle(declarations)
}
