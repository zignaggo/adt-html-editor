import type { Point } from '../geometry'
import { normalizeAngle } from './transformValue'

const RIGHT_ANGLE_TOLERANCE = 1

export function angleFromPointer(center: Point, pointer: Point): number {
  return (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI
}

export function snapAngle(degrees: number, step: number): number {
  if (step <= 0) return normalizeAngle(degrees)
  return normalizeAngle(Math.round(degrees / step) * step)
}

export function snapToRightAngles(degrees: number, tolerance = RIGHT_ANGLE_TOLERANCE): number {
  const nearest = Math.round(degrees / 90) * 90
  return normalizeAngle(Math.abs(degrees - nearest) <= tolerance ? nearest : degrees)
}

export function rotatePoint(point: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos }
}
