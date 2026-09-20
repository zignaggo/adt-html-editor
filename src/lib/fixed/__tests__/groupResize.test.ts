import { describe, expect, it } from 'vitest'
import type { Box } from '../geometry'
import { groupResizeStyles, type GroupSnapshot, type MemberSnapshot } from '../transform/gesture'
import type { ElementTransform } from '../transform/elementTransform'

const TRANSFORM: ElementTransform = {
  angle: 0,
  base: 0,
  origin: { x: 0.5, y: 0.5 },
  margin: { x: 0, y: 0 },
  display: 'block',
}

function member(box: Box, style: string, display: ElementTransform['display'] = 'block'): MemberSnapshot {
  return {
    nodeId: `${box.x}-${box.y}`,
    element: document.createElement('div'),
    style,
    box,
    styleOrigin: { x: 0, y: 0 },
    transform: { ...TRANSFORM, display },
  }
}

const A = member(
  { x: 100, y: 200, width: 300, height: 120 },
  'position: absolute; left: 100px; top: 200px; width: 300px; height: 120px',
)
const B = member(
  { x: 700, y: 900, width: 200, height: 100 },
  'position: absolute; left: 700px; top: 900px; width: 200px; height: 100px',
)

const SNAPSHOT: GroupSnapshot = {
  members: [A, B],
  box: { x: 100, y: 200, width: 800, height: 800 },
  siblings: [],
}

describe('groupResizeStyles', () => {
  it('scales position and size of every member proportionally', () => {
    const styles = groupResizeStyles(SNAPSHOT, { x: 100, y: 200, width: 880, height: 880 }, 1)
    expect(styles[0]).toBe('position: absolute; left: 100px; top: 200px; width: 330px; height: 132px')
    expect(styles[1]).toBe('position: absolute; left: 760px; top: 970px; width: 220px; height: 110px')
  })

  it('writes only the scaled axis', () => {
    const styles = groupResizeStyles(SNAPSHOT, { x: 100, y: 200, width: 880, height: 800 }, 1)
    expect(styles[0]).toBe('position: absolute; left: 100px; top: 200px; width: 330px; height: 120px')
    expect(styles[1]).toBe('position: absolute; left: 760px; top: 900px; width: 220px; height: 100px')
  })

  it('keeps both sizes untouched when nothing scales', () => {
    const styles = groupResizeStyles(SNAPSHOT, SNAPSHOT.box, 1)
    expect(styles[0]).toBe('position: absolute; left: 100px; top: 200px; width: 300px; height: 120px')
  })

  it('promotes an inline member to inline-block', () => {
    const inline = member({ x: 100, y: 200, width: 100, height: 20 }, 'position: absolute', 'inline')
    const snapshot: GroupSnapshot = {
      members: [inline],
      box: { x: 100, y: 200, width: 100, height: 20 },
      siblings: [],
    }
    const styles = groupResizeStyles(snapshot, { x: 100, y: 200, width: 200, height: 20 }, 1)
    expect(styles[0]).toContain('display: inline-block')
    expect(styles[0]).toContain('width: 200px')
  })
})
