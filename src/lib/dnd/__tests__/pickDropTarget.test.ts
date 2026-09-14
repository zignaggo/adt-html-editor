import { describe, expect, it } from 'vitest'
import type { DropTargetRecord, Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { parseHtml } from '../../core/html/parse'
import { childrenOf } from '../../core/model'
import { attachCanvasZone, computeZone, extractCanvasZone, type LayoutAxis } from '../canvasHitbox'
import { canvasTarget, isCanvasTarget } from '../data'
import { pickDropTarget } from '../pickDropTarget'
import { resolveDrop } from '../resolveDrop'

type Box = { top: number; left: number; width: number; height: number }

function stubElement(box: Box): HTMLElement {
  const element = document.createElement('div')
  const rect = {
    ...box,
    bottom: box.top + box.height,
    right: box.left + box.width,
    x: box.left,
    y: box.top,
  }
  element.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect
  return element
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

function record(options: {
  nodeId: string
  box: Box
  canNest: boolean
  outerAxis?: LayoutAxis
  innerAxis?: LayoutAxis
  input: Input
}): DropTargetRecord {
  const element = stubElement(options.box)
  const zone = computeZone({
    rect: element.getBoundingClientRect(),
    input: options.input,
    axis: options.outerAxis ?? 'column',
    canNest: options.canNest,
  })
  return {
    element,
    dropEffect: 'move',
    isActiveDueToStickiness: false,
    data: attachCanvasZone(
      canvasTarget({
        nodeId: options.nodeId,
        canNest: options.canNest,
        nestAxis: options.innerAxis ?? 'column',
      }),
      zone,
    ),
  }
}

const HTML =
  '<section id="s"><div id="a"><span id="x">x</span></div><div id="b"></div></section><aside id="other"><div id="c"></div></aside>'

const SECTION: Box = { top: 0, left: 0, width: 400, height: 600 }
const A: Box = { top: 20, left: 20, width: 360, height: 260 }
const X: Box = { top: 40, left: 40, width: 320, height: 220 }
const B: Box = { top: 320, left: 20, width: 360, height: 260 }
const OTHER: Box = { top: 700, left: 0, width: 400, height: 300 }
const C: Box = { top: 720, left: 20, width: 360, height: 260 }

function setup() {
  const doc = parseHtml(HTML)
  const [section, other] = childrenOf(doc, doc.rootId)
  const [a, b] = childrenOf(doc, section)
  const [x] = childrenOf(doc, a)
  const [c] = childrenOf(doc, other)
  return { doc, section, a, b, x, other, c }
}

function describeTarget(target: DropTargetRecord | undefined) {
  if (!target || !isCanvasTarget(target.data)) return null
  return { nodeId: target.data.nodeId, zone: extractCanvasZone(target.data) }
}

describe('pickDropTarget', () => {
  it('turns the wide band of a sibling into a reorder even though the sibling can nest', () => {
    const { doc, section, a, b } = setup()
    const input = inputAt(200, 400)
    const targets = [
      record({ nodeId: b, box: B, canNest: true, input }),
      record({ nodeId: section, box: SECTION, canNest: true, input }),
    ]
    expect(describeTarget(targets[0])?.zone).toEqual({ type: 'inside' })

    const picked = pickDropTarget(doc, targets, a, input)
    expect(describeTarget(picked)).toEqual({ nodeId: b, zone: { type: 'edge', edge: 'top' } })
    expect(resolveDrop(doc, picked, a, input)).toEqual({ parentId: section, index: 1 })
  })

  it('still nests into a sibling from its core', () => {
    const { doc, section, a, b } = setup()
    const input = inputAt(200, 450)
    const targets = [
      record({ nodeId: b, box: B, canNest: true, input }),
      record({ nodeId: section, box: SECTION, canNest: true, input }),
    ]
    const picked = pickDropTarget(doc, targets, a, input)
    expect(picked).toBe(targets[0])
    expect(resolveDrop(doc, picked, a, input)).toEqual({ parentId: b, index: 0 })
  })

  it('maps a pointer over a sibling descendant to the sibling itself', () => {
    const { doc, section, a, b, x } = setup()
    const input = inputAt(200, 60)
    const targets = [
      record({ nodeId: x, box: X, canNest: false, input }),
      record({ nodeId: a, box: A, canNest: true, input }),
      record({ nodeId: section, box: SECTION, canNest: true, input }),
    ]
    const picked = pickDropTarget(doc, targets, b, input)
    expect(describeTarget(picked)).toEqual({ nodeId: a, zone: { type: 'edge', edge: 'top' } })
    expect(resolveDrop(doc, picked, b, input)).toEqual({ parentId: section, index: 0 })
  })

  it('treats the edge of the parent itself as a position inside it', () => {
    const { doc, section, a } = setup()
    const input = inputAt(200, 4)
    const targets = [record({ nodeId: section, box: SECTION, canNest: true, input })]
    expect(describeTarget(targets[0])?.zone).toEqual({ type: 'edge', edge: 'top' })

    const picked = pickDropTarget(doc, targets, a, input)
    expect(describeTarget(picked)).toEqual({ nodeId: section, zone: { type: 'inside' } })
  })

  it('follows the parent layout axis for the sibling band', () => {
    const { doc, section, a, b } = setup()
    const input = inputAt(30, 450)
    const targets = [
      record({ nodeId: b, box: B, canNest: true, outerAxis: 'row', input }),
      record({ nodeId: section, box: SECTION, canNest: true, innerAxis: 'row', input }),
    ]
    const picked = pickDropTarget(doc, targets, a, input)
    expect(describeTarget(picked)).toEqual({ nodeId: b, zone: { type: 'edge', edge: 'left' } })
  })

  it('leaves targets outside the parent subtree untouched', () => {
    const { doc, a, other, c } = setup()
    const input = inputAt(200, 800)
    const targets = [
      record({ nodeId: c, box: C, canNest: true, input }),
      record({ nodeId: other, box: OTHER, canNest: true, input }),
    ]
    expect(pickDropTarget(doc, targets, a, input)).toBe(targets[0])
  })

  it('leaves palette drags untouched', () => {
    const { doc, section, b } = setup()
    const input = inputAt(200, 400)
    const targets = [
      record({ nodeId: b, box: B, canNest: true, input }),
      record({ nodeId: section, box: SECTION, canNest: true, input }),
    ]
    expect(pickDropTarget(doc, targets, null, input)).toBe(targets[0])
  })

  it('returns undefined when there is no target', () => {
    const { doc, a } = setup()
    expect(pickDropTarget(doc, [], a, inputAt(0, 0))).toBeUndefined()
  })
})
