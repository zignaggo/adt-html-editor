import { roundTo, type Point, type Size } from '../geometry'
import { layoutOriginOf } from './layoutBox'
import { inlineRotation, normalizeAngle, rotationIn } from './transformValue'

const ANGLE_READ_PRECISION = 0.01

export type ElementTransform = {
  angle: number
  base: number
  origin: Point
  margin: Point
  display: string
}

const CENTER: Point = { x: 0.5, y: 0.5 }

function fractionOf(part: string | undefined, size: number): number | null {
  if (!part) return null
  if (part.endsWith('%')) {
    const percent = Number.parseFloat(part)
    return Number.isFinite(percent) ? percent / 100 : null
  }
  const px = Number.parseFloat(part)
  if (!Number.isFinite(px) || size <= 0) return null
  return px / size
}

export function originFractions(value: string, size: Size): Point {
  const parts = value.trim().split(/\s+/)
  const x = fractionOf(parts[0], size.width)
  const y = fractionOf(parts[1], size.height)
  if (x === null || y === null) return CENTER
  return { x, y }
}

export function readElementTransform(
  element: HTMLElement,
  style: string | undefined,
  size: Size,
): ElementTransform {
  const computed = getComputedStyle(element)
  const angle = roundTo(rotationIn(computed.transform) ?? 0, ANGLE_READ_PRECISION)
  return {
    angle,
    base: roundTo(normalizeAngle(angle - inlineRotation(style)), ANGLE_READ_PRECISION),
    origin: originFractions(computed.transformOrigin, size),
    margin: {
      x: Number.parseFloat(computed.marginLeft) || 0,
      y: Number.parseFloat(computed.marginTop) || 0,
    },
    display: computed.display,
  }
}

export function styleOriginOf(element: HTMLElement, root: Element): Point {
  const origin = layoutOriginOf(element, root)
  const computed = getComputedStyle(element)
  return {
    x: origin.x + (Number.parseFloat(computed.marginLeft) || 0),
    y: origin.y + (Number.parseFloat(computed.marginTop) || 0),
  }
}
