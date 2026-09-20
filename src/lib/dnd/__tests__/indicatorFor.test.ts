import { describe, expect, it } from 'vitest'
import type { DropTargetRecord, Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { attachCanvasZone, type CanvasZone, type LayoutAxis } from '../canvasHitbox'
import { canvasTarget } from '../data'
import { indicatorFor } from '../indicatorFor'

type Box = { top: number; left: number; width: number; height: number }

function rectOf(box: Box): DOMRect {
  const full = {
    ...box,
    bottom: box.top + box.height,
    right: box.left + box.width,
    x: box.left,
    y: box.top,
  }
  return { ...full, toJSON: () => full } as DOMRect
}

function inputAt(clientX: number, clientY: number): Input {
  return {
    altKey: false,
    button: 0,
    buttons: 1,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    clientX,
    clientY,
    pageX: clientX,
    pageY: clientY,
  }
}

const CARDS: Box[] = [
  { top: 100, left: 0, width: 180, height: 90 },
  { top: 100, left: 200, width: 180, height: 90 },
]

function rowOf(boxes: Box[]): HTMLElement {
  const element = document.createElement('div')
  element.getBoundingClientRect = () => rectOf({ top: 100, left: 0, width: 380, height: 90 })
  boxes.forEach((box, index) => {
    const child = document.createElement('div')
    child.setAttribute('data-adt-id', `c${index}`)
    child.getBoundingClientRect = () => rectOf(box)
    element.appendChild(child)
  })
  return element
}

function record(options: {
  element: Element
  nodeId: string
  zone: CanvasZone
  nestAxis?: LayoutAxis
}): DropTargetRecord {
  return {
    element: options.element,
    dropEffect: 'move',
    isActiveDueToStickiness: false,
    data: attachCanvasZone(
      canvasTarget({
        nodeId: options.nodeId,
        canNest: true,
        nestAxis: options.nestAxis ?? 'row',
      }),
      options.zone,
    ),
  }
}

describe('indicatorFor on a canvas row', () => {
  it('draws the edge of a card as a line centred in the gap', () => {
    const row = rowOf(CARDS)
    const indicator = indicatorFor(
      record({ element: row.children[1], nodeId: 'c1', zone: { type: 'edge', edge: 'left' } }),
      inputAt(204, 140),
    )
    expect(indicator).toEqual({
      surface: 'canvas',
      shape: { kind: 'line', axis: 'vertical', top: 100, left: 189, length: 90, indent: 0 },
    })
  })

  it('draws the same line when the pointer is in the gap of the container', () => {
    const row = rowOf(CARDS)
    const indicator = indicatorFor(
      record({ element: row, nodeId: 'row', zone: { type: 'inside' } }),
      inputAt(190, 140),
    )
    expect(indicator?.shape).toEqual({
      kind: 'line',
      axis: 'vertical',
      top: 100,
      left: 189,
      length: 90,
      indent: 0,
    })
  })

  it('falls back to a box on an empty container', () => {
    const empty = rowOf([])
    const indicator = indicatorFor(
      record({ element: empty, nodeId: 'row', zone: { type: 'inside' } }),
      inputAt(190, 140),
    )
    expect(indicator?.shape).toEqual({ kind: 'box', top: 100, left: 0, width: 380, height: 90 })
  })
})
