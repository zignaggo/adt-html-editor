import { describe, expect, it } from 'vitest'
import { snapWithGuides } from '../guides/computeGuides'

const page = { width: 1000, height: 1000 }
const sibling = { x: 100, y: 100, width: 200, height: 100 }

describe('snapWithGuides', () => {
  it('snaps a left edge to a sibling left edge and draws a vertical guide spanning both', () => {
    const result = snapWithGuides({ x: 103, y: 400, width: 50, height: 50 }, [sibling], page, 5)
    expect(result.x).toBe(100)
    expect(result.y).toBe(400)
    expect(result.guides).toEqual([{ axis: 'vertical', at: 100, from: 100, to: 450 }])
  })

  it('snaps a right edge to a sibling right edge', () => {
    const result = snapWithGuides({ x: 253, y: 400, width: 50, height: 50 }, [sibling], page, 5)
    expect(result.x).toBe(250)
    expect(result.guides[0]).toMatchObject({ axis: 'vertical', at: 300 })
  })

  it('snaps centers on both axes to the page center', () => {
    const result = snapWithGuides({ x: 477, y: 473, width: 50, height: 50 }, [], page, 5)
    expect(result).toMatchObject({ x: 475, y: 475 })
    expect(result.guides).toEqual([
      { axis: 'vertical', at: 500, from: 0, to: 1000 },
      { axis: 'horizontal', at: 500, from: 0, to: 1000 },
    ])
  })

  it('prefers the smallest delta, then edges over centers', () => {
    const result = snapWithGuides({ x: 98, y: 400, width: 200, height: 50 }, [sibling], page, 5)
    expect(result.x).toBe(100)
    const exact = snapWithGuides({ x: 310, y: 400, width: 200, height: 50 }, [{ x: 312, y: 0, width: 196, height: 10 }], page, 5)
    expect(exact.x).toBe(310)
    const tie = snapWithGuides({ x: 310, y: 400, width: 200, height: 50 }, [{ x: 312, y: 0, width: 200, height: 10 }], page, 5)
    expect(tie.x).toBe(312)
    expect(tie.guides[0]).toMatchObject({ axis: 'vertical', at: 312 })
  })

  it('leaves the box alone outside the threshold or when disabled', () => {
    const box = { x: 120, y: 400, width: 50, height: 50 }
    expect(snapWithGuides(box, [sibling], page, 5)).toEqual({ x: 120, y: 400, guides: [] })
    expect(snapWithGuides({ x: 101, y: 400, width: 50, height: 50 }, [sibling], page, 0)).toEqual({
      x: 101,
      y: 400,
      guides: [],
    })
  })
})
