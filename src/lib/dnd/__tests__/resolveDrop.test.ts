import { describe, expect, it } from 'vitest'
import type { DropTargetRecord, Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { attachInstruction, type ItemMode } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item'
import { attachCanvasZone, computeZone, type LayoutAxis } from '../canvasHitbox'
import { parseHtml } from '../../core/html/parse'
import { childrenOf, type EditorDocument } from '../../core/model'
import { canvasTarget, surfaceTarget, treeTarget } from '../data'
import { resolveDrop } from '../resolveDrop'
import { INDENT_PER_LEVEL } from '../useTreeDropTarget'

const ROW_TOP = 100
const ROW_HEIGHT = 30
const ROW_LEFT = 0
const ROW_WIDTH = 240

function stubElement(rect: Partial<DOMRect> = {}): HTMLElement {
  const element = document.createElement('div')
  const box = {
    top: ROW_TOP,
    left: ROW_LEFT,
    width: ROW_WIDTH,
    height: ROW_HEIGHT,
    bottom: ROW_TOP + ROW_HEIGHT,
    right: ROW_LEFT + ROW_WIDTH,
    x: ROW_LEFT,
    y: ROW_TOP,
    ...rect,
  }
  element.getBoundingClientRect = () => ({ ...box, toJSON: () => box }) as DOMRect
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

function treeRecord(options: {
  nodeId: string
  level: number
  mode: ItemMode
  clientX: number
  clientY: number
}): DropTargetRecord {
  const element = stubElement()
  return {
    element,
    dropEffect: 'move',
    isActiveDueToStickiness: false,
    data: attachInstruction(treeTarget({ nodeId: options.nodeId, level: options.level }), {
      element,
      input: inputAt(options.clientX, options.clientY),
      currentLevel: options.level,
      indentPerLevel: INDENT_PER_LEVEL,
      mode: options.mode,
    }),
  }
}

function canvasRecord(options: {
  nodeId: string
  canNest: boolean
  axis?: LayoutAxis
  clientX: number
  clientY: number
  element?: HTMLElement
}): DropTargetRecord {
  const element = options.element ?? stubElement()
  const axis = options.axis ?? 'column'
  const input = inputAt(options.clientX, options.clientY)
  const zone = computeZone({
    rect: element.getBoundingClientRect(),
    input,
    axis,
    canNest: options.canNest,
  })
  return {
    element,
    dropEffect: 'move',
    isActiveDueToStickiness: false,
    data: attachCanvasZone(
      canvasTarget({ nodeId: options.nodeId, canNest: options.canNest, nestAxis: axis }),
      zone,
    ),
  }
}

function surfaceRecord(): DropTargetRecord {
  return {
    element: stubElement(),
    dropEffect: 'move',
    isActiveDueToStickiness: false,
    data: surfaceTarget({ surface: 'tree' }),
  }
}

function ids(doc: EditorDocument) {
  const root = childrenOf(doc, doc.rootId)
  const section = root[0]
  const [p1, p2] = childrenOf(doc, section)
  return { root, section, p1, p2, aside: root[1] }
}

describe('resolveDrop in the tree', () => {
  const doc = parseHtml('<section><p>one</p><p>two</p></section><aside></aside>')
  const { section, p1, p2, aside } = ids(doc)

  it('reorder-above inserts before the target', () => {
    const target = treeRecord({ nodeId: p2, level: 1, mode: 'standard', clientX: 120, clientY: ROW_TOP + 2 })
    expect(resolveDrop(doc, target, aside)).toEqual({ parentId: section, index: 1 })
  })

  it('reorder-below inserts after the target', () => {
    const target = treeRecord({
      nodeId: p1,
      level: 1,
      mode: 'standard',
      clientX: 120,
      clientY: ROW_TOP + ROW_HEIGHT - 2,
    })
    expect(resolveDrop(doc, target, aside)).toEqual({ parentId: section, index: 1 })
  })

  it('make-child inserts inside the target', () => {
    const target = treeRecord({
      nodeId: section,
      level: 0,
      mode: 'standard',
      clientX: 120,
      clientY: ROW_TOP + ROW_HEIGHT / 2,
    })
    expect(resolveDrop(doc, target, aside)).toEqual({ parentId: section, index: 0 })
  })

  it('reparent climbs to the desired level', () => {
    const target = treeRecord({
      nodeId: p2,
      level: 1,
      mode: 'last-in-group',
      clientX: 2,
      clientY: ROW_TOP + ROW_HEIGHT - 2,
    })
    const resolved = resolveDrop(doc, target, aside)
    expect(resolved).toEqual({ parentId: doc.rootId, index: 1 })
  })

  it('refuses to drop inside its own subtree', () => {
    const target = treeRecord({
      nodeId: p1,
      level: 1,
      mode: 'standard',
      clientX: 120,
      clientY: ROW_TOP + ROW_HEIGHT / 2,
    })
    expect(resolveDrop(doc, target, section)).toBeNull()
  })

  it('refuses a target without a valid instruction', () => {
    const target: DropTargetRecord = {
      element: stubElement(),
      dropEffect: 'move',
    isActiveDueToStickiness: false,
      data: treeTarget({ nodeId: p1, level: 1 }),
    }
    expect(resolveDrop(doc, target, aside)).toBeNull()
  })

  it('without a target, does not resolve', () => {
    expect(resolveDrop(doc, undefined, aside)).toBeNull()
  })
})

describe('resolveDrop on the canvas', () => {
  const doc = parseHtml('<section><p>one</p><p>two</p></section><aside></aside>')
  const { section, p1, p2, aside } = ids(doc)

  it('top edge inserts before', () => {
    const target = canvasRecord({ nodeId: p2, canNest: false, clientX: 120, clientY: ROW_TOP + 2 })
    expect(resolveDrop(doc, target, aside)).toEqual({ parentId: section, index: 1 })
  })

  it('bottom edge inserts after', () => {
    const target = canvasRecord({
      nodeId: p1,
      canNest: false,
      clientX: 120,
      clientY: ROW_TOP + ROW_HEIGHT - 2,
    })
    expect(resolveDrop(doc, target, aside)).toEqual({ parentId: section, index: 1 })
  })

  it('left edge in row layout inserts before', () => {
    const target = canvasRecord({
      nodeId: p2,
      canNest: false,
      axis: 'row',
      clientX: ROW_LEFT + 2,
      clientY: ROW_TOP + 15,
    })
    expect(resolveDrop(doc, target, aside)).toEqual({ parentId: section, index: 1 })
  })

  it('right edge in row layout inserts after', () => {
    const target = canvasRecord({
      nodeId: p1,
      canNest: false,
      axis: 'row',
      clientX: ROW_LEFT + ROW_WIDTH - 2,
      clientY: ROW_TOP + 15,
    })
    expect(resolveDrop(doc, target, aside)).toEqual({ parentId: section, index: 1 })
  })

  it('an element that cannot have children never offers inside, even at the center', () => {
    const target = canvasRecord({
      nodeId: p1,
      canNest: false,
      clientX: 120,
      clientY: ROW_TOP + ROW_HEIGHT / 2 - 1,
    })
    expect(resolveDrop(doc, target, aside)).toEqual({ parentId: section, index: 0 })
  })

  it('an empty container accepts inside', () => {
    const target = canvasRecord({
      nodeId: aside,
      canNest: true,
      clientX: 120,
      clientY: ROW_TOP + ROW_HEIGHT / 2,
    })
    expect(resolveDrop(doc, target, p1)).toEqual({ parentId: aside, index: 0 })
  })

  it('a container with children accepts inside at the center and appends at the end', () => {
    const target = canvasRecord({
      nodeId: section,
      canNest: true,
      clientX: 120,
      clientY: ROW_TOP + ROW_HEIGHT / 2,
    })
    expect(resolveDrop(doc, target, aside)).toEqual({ parentId: section, index: 2 })
  })

  it('a container with children still offers edge near the boundary', () => {
    const target = canvasRecord({
      nodeId: section,
      canNest: true,
      clientX: 120,
      clientY: ROW_TOP + 1,
    })
    expect(resolveDrop(doc, target, aside)).toEqual({ parentId: doc.rootId, index: 0 })
  })

  it('refuses to insert inside a void tag', () => {
    const voidDoc = parseHtml('<div><img src="a.png"></div><p>x</p>')
    const img = childrenOf(voidDoc, childrenOf(voidDoc, voidDoc.rootId)[0])[0]
    const target = canvasRecord({
      nodeId: img,
      canNest: true,
      clientX: 120,
      clientY: ROW_TOP + ROW_HEIGHT / 2,
    })
    expect(resolveDrop(voidDoc, target, null)).toBeNull()
  })
})

describe('resolveDrop on the fallback surface', () => {
  it('appends at the end of the root', () => {
    const doc = parseHtml('<section></section><aside></aside>')
    expect(resolveDrop(doc, surfaceRecord(), null)).toEqual({ parentId: doc.rootId, index: 2 })
  })

  it('works on an empty document', () => {
    const doc = parseHtml('')
    expect(resolveDrop(doc, surfaceRecord(), null)).toEqual({ parentId: doc.rootId, index: 0 })
  })
})
