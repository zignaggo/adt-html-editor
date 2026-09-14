import type { NodeId } from '../../core/ids'
import { isStyled } from '../../core/model'
import { formatInlineStyle, parseInlineStyle } from '../../style/adapter'
import { containerElementOf, type FixedDragEnv } from '../fixedDrag'
import { measureScale, readBox, roundTo, toPage, type Box, type Point } from '../geometry'
import { positionDeclarations, sizeDeclarations } from '../position'
import { readElementTransform, type ElementTransform } from './elementTransform'
import { movesX, movesY, type HandleId } from './handleSpecs'
import { layoutOriginOf, readLayoutBox } from './layoutBox'
import { pointOnBox, resizeBox, snapResizeEdges } from './resize'
import { angleFromPointer, snapAngle, snapToRightAngles } from './rotation'
import {
  beginTransformGesture,
  endTransformGesture,
  updateTransformGesture,
} from './transformGestureStore'
import { formatAngle, withRotation } from './transformValue'

const GESTURE_ATTRIBUTE = 'data-adt-fixed-gesture'
const MIN_SIZE = 1
const ANGLE_STEP = 15

export type GestureSnapshot = {
  nodeId: NodeId
  element: HTMLElement
  style: string | undefined
  box: Box
  styleOrigin: Point
  transform: ElementTransform
  siblings: Box[]
}

export type GestureInput = {
  clientX: number
  clientY: number
  shiftKey: boolean
  altKey: boolean
}

export type GestureController = {
  move: (input: GestureInput) => void
  finish: () => void
  cancel: () => void
}

export function takeGestureSnapshot(
  env: FixedDragEnv,
  nodeId: NodeId,
  element: HTMLElement,
): GestureSnapshot | null {
  const root = env.pageElement
  const node = env.store.state.doc.nodes[nodeId]
  if (!root || !node || !isStyled(node)) return null
  const style = node.attrs.style
  const box = readLayoutBox(element, root)
  const origin = layoutOriginOf(element, root)
  const transform = readElementTransform(element, style, box)
  const scale = measureScale(root.getBoundingClientRect(), env.page.width)
  const siblings: Box[] = []
  const container = containerElementOf(env)
  if (container) {
    for (const child of Array.from(container.children)) {
      if (!(child instanceof HTMLElement) || child === element) continue
      if (!child.hasAttribute('data-adt-id')) continue
      siblings.push(readBox(child, root, scale))
    }
  }
  return {
    nodeId,
    element,
    style,
    box,
    styleOrigin: { x: origin.x + transform.margin.x, y: origin.y + transform.margin.y },
    transform,
    siblings,
  }
}

function resizeStyle(
  snapshot: GestureSnapshot,
  box: Box,
  handle: HandleId,
  keepRatio: boolean,
  precision: number,
): string {
  let style = positionDeclarations(
    snapshot.style,
    box.x - snapshot.styleOrigin.x,
    box.y - snapshot.styleOrigin.y,
    precision,
  )
  style = sizeDeclarations(
    style,
    movesX(handle) || keepRatio ? box.width : null,
    movesY(handle) || keepRatio ? box.height : null,
    precision,
  )
  if (snapshot.transform.display === 'inline') {
    const declarations = parseInlineStyle(style)
    declarations.set('display', 'inline-block')
    style = formatInlineStyle(declarations)
  }
  return style
}

function rotationStyle(snapshot: GestureSnapshot, angle: number): string {
  return withRotation(snapshot.style, angle - snapshot.transform.base)
}

function restoreSnapshot(snapshot: GestureSnapshot) {
  if (snapshot.style === undefined) snapshot.element.removeAttribute('style')
  else snapshot.element.setAttribute('style', snapshot.style)
}

function pagePoint(env: FixedDragEnv, input: GestureInput): { point: Point; scale: number } {
  const root = env.pageElement
  if (!root) return { point: { x: input.clientX, y: input.clientY }, scale: 1 }
  const rect = root.getBoundingClientRect()
  const scale = measureScale(rect, env.page.width)
  return { point: toPage({ x: input.clientX, y: input.clientY }, rect, scale), scale }
}

function createController(
  env: FixedDragEnv,
  snapshot: GestureSnapshot,
  compute: (input: GestureInput) => string,
): GestureController {
  let last: string | null = null
  env.pageElement?.setAttribute(GESTURE_ATTRIBUTE, '')

  const teardown = () => {
    env.pageElement?.removeAttribute(GESTURE_ATTRIBUTE)
    endTransformGesture()
  }

  return {
    move(input) {
      const style = compute(input)
      if (style === last) return
      last = style
      snapshot.element.setAttribute('style', style)
    },
    finish() {
      teardown()
      if (last === null || last === (snapshot.style ?? '')) {
        restoreSnapshot(snapshot)
        return
      }
      env.store.actions.placeNode(snapshot.nodeId, { style: last })
    },
    cancel() {
      teardown()
      restoreSnapshot(snapshot)
    },
  }
}

export function startResizeGesture(
  env: FixedDragEnv,
  snapshot: GestureSnapshot,
  handle: HandleId,
  start: GestureInput,
  keepRatioDefault = false,
): GestureController {
  const { point: origin } = pagePoint(env, start)
  const { angle, origin: pivot } = snapshot.transform

  beginTransformGesture({
    kind: 'resize',
    nodeId: snapshot.nodeId,
    handle,
    box: snapshot.box,
    angle,
    guides: [],
  })

  return createController(env, snapshot, (input) => {
    const { point, scale } = pagePoint(env, input)
    const keepRatio = input.shiftKey || keepRatioDefault
    let box = resizeBox({
      box: snapshot.box,
      angle,
      origin: pivot,
      handle,
      delta: { x: point.x - origin.x, y: point.y - origin.y },
      keepRatio,
      fromCenter: input.altKey,
      min: MIN_SIZE,
    })
    const snapped =
      angle === 0 && !keepRatio && !input.altKey
        ? snapResizeEdges(box, handle, snapshot.siblings, env.page, env.snapThreshold / scale, MIN_SIZE)
        : null
    if (snapped) box = snapped.box
    box = {
      x: roundTo(box.x, env.precision),
      y: roundTo(box.y, env.precision),
      width: roundTo(box.width, env.precision),
      height: roundTo(box.height, env.precision),
    }
    updateTransformGesture({ box, guides: snapped?.guides ?? [] })
    return resizeStyle(snapshot, box, handle, keepRatio, env.precision)
  })
}

export function startRotateGesture(
  env: FixedDragEnv,
  snapshot: GestureSnapshot,
  start: GestureInput,
): GestureController {
  const { point } = pagePoint(env, start)
  const { angle, origin } = snapshot.transform
  const center = pointOnBox(snapshot.box, angle, origin, origin)
  const offset = angleFromPointer(center, point) - angle

  beginTransformGesture({
    kind: 'rotate',
    nodeId: snapshot.nodeId,
    handle: null,
    box: snapshot.box,
    angle,
    guides: [],
  })

  return createController(env, snapshot, (input) => {
    const raw = angleFromPointer(center, pagePoint(env, input).point) - offset
    let next: number
    if (input.shiftKey) next = snapAngle(raw, ANGLE_STEP)
    else if (input.altKey) next = raw
    else next = snapToRightAngles(raw)
    next = formatAngle(next)
    updateTransformGesture({ angle: next })
    return rotationStyle(snapshot, next)
  })
}
