import type { NodeId } from '../../core/ids'
import type { PlaceUpdate } from '../../core/store'
import { isStyled } from '../../core/model'
import { formatInlineStyle, parseInlineStyle } from '../../style/adapter'
import { containerElementOf, type FixedDragEnv } from '../fixedDrag'
import { measureScale, readBox, roundTo, toPage, type Box, type Point } from '../geometry'
import { positionDeclarations, sizeDeclarations } from '../position'
import { readElementTransform, type ElementTransform } from './elementTransform'
import { minGroupSize, scaleBoxWithin, unionBoxes } from './groupBox'
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
const GROUP_ORIGIN: Point = { x: 0.5, y: 0.5 }

export type MemberSnapshot = {
  nodeId: NodeId
  element: HTMLElement
  style: string | undefined
  box: Box
  styleOrigin: Point
  transform: ElementTransform
}

export type GestureSnapshot = MemberSnapshot & {
  siblings: Box[]
}

export type GroupSnapshot = {
  members: MemberSnapshot[]
  box: Box
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

function snapshotMember(
  env: FixedDragEnv,
  nodeId: NodeId,
  element: HTMLElement,
): MemberSnapshot | null {
  const root = env.pageElement
  const node = env.store.state.doc.nodes[nodeId]
  if (!root || !node || !isStyled(node)) return null
  const style = node.attrs.style
  const box = readLayoutBox(element, root)
  const origin = layoutOriginOf(element, root)
  const transform = readElementTransform(element, style, box)
  return {
    nodeId,
    element,
    style,
    box,
    styleOrigin: { x: origin.x + transform.margin.x, y: origin.y + transform.margin.y },
    transform,
  }
}

function siblingBoxesOf(env: FixedDragEnv, exclude: ReadonlySet<Element>): Box[] {
  const root = env.pageElement
  const container = containerElementOf(env)
  if (!root || !container) return []
  const scale = measureScale(root.getBoundingClientRect(), env.page.width)
  const out: Box[] = []
  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement) || exclude.has(child)) continue
    if (!child.hasAttribute('data-adt-id')) continue
    out.push(readBox(child, root, scale))
  }
  return out
}

export function takeGestureSnapshot(
  env: FixedDragEnv,
  nodeId: NodeId,
  element: HTMLElement,
): GestureSnapshot | null {
  const member = snapshotMember(env, nodeId, element)
  if (!member) return null
  return { ...member, siblings: siblingBoxesOf(env, new Set([element])) }
}

export function takeGroupSnapshot(env: FixedDragEnv, ids: readonly NodeId[]): GroupSnapshot | null {
  const root = env.pageElement
  if (!root) return null
  const members: MemberSnapshot[] = []
  for (const id of ids) {
    const element = root.querySelector<HTMLElement>(`[data-adt-id="${id}"]`)
    if (!element) continue
    const member = snapshotMember(env, id, element)
    if (member) members.push(member)
  }
  const box = unionBoxes(members.map((member) => member.box))
  if (!box) return null
  return { members, box, siblings: siblingBoxesOf(env, new Set(members.map((m) => m.element))) }
}

function memberStyle(
  member: MemberSnapshot,
  box: Box,
  writeWidth: boolean,
  writeHeight: boolean,
  precision: number,
): string {
  let style = positionDeclarations(
    member.style,
    box.x - member.styleOrigin.x,
    box.y - member.styleOrigin.y,
    precision,
  )
  style = sizeDeclarations(
    style,
    writeWidth ? box.width : null,
    writeHeight ? box.height : null,
    precision,
  )
  if (member.transform.display === 'inline') {
    const declarations = parseInlineStyle(style)
    declarations.set('display', 'inline-block')
    style = formatInlineStyle(declarations)
  }
  return style
}

function resizeStyle(
  snapshot: GestureSnapshot,
  box: Box,
  handle: HandleId,
  keepRatio: boolean,
  precision: number,
): string {
  return memberStyle(
    snapshot,
    box,
    movesX(handle) || keepRatio,
    movesY(handle) || keepRatio,
    precision,
  )
}

export function groupResizeStyles(
  snapshot: GroupSnapshot,
  box: Box,
  precision: number,
): string[] {
  const scaledX = box.width !== snapshot.box.width
  const scaledY = box.height !== snapshot.box.height
  return snapshot.members.map((member) =>
    memberStyle(member, scaleBoxWithin(member.box, snapshot.box, box), scaledX, scaledY, precision),
  )
}

function rotationStyle(member: MemberSnapshot, angle: number): string {
  return withRotation(member.style, angle - member.transform.base)
}

function restoreSnapshot(member: MemberSnapshot) {
  if (member.style === undefined) member.element.removeAttribute('style')
  else member.element.setAttribute('style', member.style)
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
  members: readonly MemberSnapshot[],
  compute: (input: GestureInput) => string[],
): GestureController {
  let last: string[] | null = null
  env.pageElement?.setAttribute(GESTURE_ATTRIBUTE, '')

  const teardown = () => {
    env.pageElement?.removeAttribute(GESTURE_ATTRIBUTE)
    endTransformGesture()
  }

  return {
    move(input) {
      const styles = compute(input)
      for (let index = 0; index < members.length; index += 1) {
        if (last && styles[index] === last[index]) continue
        members[index].element.setAttribute('style', styles[index])
      }
      last = styles
    },
    finish() {
      teardown()
      const styles = last
      if (!styles) return
      const updates: PlaceUpdate[] = []
      for (let index = 0; index < members.length; index += 1) {
        const member = members[index]
        if (styles[index] === (member.style ?? '')) continue
        updates.push({ id: member.nodeId, style: styles[index] })
      }
      if (updates.length === 0) {
        for (const member of members) restoreSnapshot(member)
        return
      }
      env.store.actions.placeNodes(updates)
    },
    cancel() {
      teardown()
      for (const member of members) restoreSnapshot(member)
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
    nodeIds: [snapshot.nodeId],
    handle,
    box: snapshot.box,
    angle,
    guides: [],
  })

  return createController(env, [snapshot], (input) => {
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
    return [resizeStyle(snapshot, box, handle, keepRatio, env.precision)]
  })
}

export function startGroupResizeGesture(
  env: FixedDragEnv,
  snapshot: GroupSnapshot,
  handle: HandleId,
  start: GestureInput,
  keepRatioDefault = false,
): GestureController {
  const { point: origin } = pagePoint(env, start)
  const min = minGroupSize(
    snapshot.members.map((member) => member.box),
    snapshot.box,
    MIN_SIZE,
  )

  beginTransformGesture({
    kind: 'resize',
    nodeIds: snapshot.members.map((member) => member.nodeId),
    handle,
    box: snapshot.box,
    angle: 0,
    guides: [],
  })

  return createController(env, snapshot.members, (input) => {
    const { point, scale } = pagePoint(env, input)
    const keepRatio = input.shiftKey || keepRatioDefault
    let box = resizeBox({
      box: snapshot.box,
      angle: 0,
      origin: GROUP_ORIGIN,
      handle,
      delta: { x: point.x - origin.x, y: point.y - origin.y },
      keepRatio,
      fromCenter: input.altKey,
      min,
    })
    const snapped =
      !keepRatio && !input.altKey
        ? snapResizeEdges(box, handle, snapshot.siblings, env.page, env.snapThreshold / scale, min)
        : null
    if (snapped) box = snapped.box
    box = {
      x: roundTo(box.x, env.precision),
      y: roundTo(box.y, env.precision),
      width: roundTo(box.width, env.precision),
      height: roundTo(box.height, env.precision),
    }
    updateTransformGesture({ box, guides: snapped?.guides ?? [] })
    return groupResizeStyles(snapshot, box, env.precision)
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
    nodeIds: [snapshot.nodeId],
    handle: null,
    box: snapshot.box,
    angle,
    guides: [],
  })

  return createController(env, [snapshot], (input) => {
    const raw = angleFromPointer(center, pagePoint(env, input).point) - offset
    let next: number
    if (input.shiftKey) next = snapAngle(raw, ANGLE_STEP)
    else if (input.altKey) next = raw
    else next = snapToRightAngles(raw)
    next = formatAngle(next)
    updateTransformGesture({ angle: next })
    return [rotationStyle(snapshot, next)]
  })
}
