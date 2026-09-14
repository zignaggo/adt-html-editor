import { describe, expect, it } from 'vitest'
import { angleFromPointer, rotatePoint, snapAngle, snapToRightAngles } from '../transform/rotation'

const center = { x: 100, y: 100 }

describe('angleFromPointer', () => {
  it('measures the pointer angle in every quadrant', () => {
    expect(angleFromPointer(center, { x: 150, y: 100 })).toBe(0)
    expect(angleFromPointer(center, { x: 100, y: 150 })).toBe(90)
    expect(angleFromPointer(center, { x: 50, y: 100 })).toBe(180)
    expect(angleFromPointer(center, { x: 100, y: 50 })).toBe(-90)
    expect(angleFromPointer(center, { x: 150, y: 150 })).toBe(45)
  })
})

describe('snapAngle', () => {
  it('rounds to the nearest step and normalizes', () => {
    expect(snapAngle(22, 15)).toBe(15)
    expect(snapAngle(23, 15)).toBe(30)
    expect(snapAngle(178, 15)).toBe(180)
    expect(snapAngle(-97, 15)).toBe(-90)
    expect(snapAngle(33.3, 0)).toBe(33.3)
  })
})

describe('snapToRightAngles', () => {
  it('sticks within the tolerance and leaves other angles alone', () => {
    expect(snapToRightAngles(89.4)).toBe(90)
    expect(snapToRightAngles(-0.7)).toBe(0)
    expect(snapToRightAngles(179.5)).toBe(180)
    expect(snapToRightAngles(87)).toBe(87)
    expect(snapToRightAngles(87, 5)).toBe(90)
  })
})

describe('rotatePoint', () => {
  it('rotates counter-clockwise in screen space for positive angles', () => {
    const rotated = rotatePoint({ x: 10, y: 0 }, 90)
    expect(rotated.x).toBeCloseTo(0, 9)
    expect(rotated.y).toBeCloseTo(10, 9)
  })

  it('is undone by the opposite angle', () => {
    const point = { x: 3, y: -7 }
    const back = rotatePoint(rotatePoint(point, 37), -37)
    expect(back.x).toBeCloseTo(point.x, 9)
    expect(back.y).toBeCloseTo(point.y, 9)
  })
})
