import type { Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled'
import type { NodeId } from '../core/ids'
import { isStyled, type EditorDocument } from '../core/model'
import type { EditorStore, NodeTemplate, PlaceUpdate } from '../core/store'
import type { PageSize } from './detect'
import {
  beginFixedSession,
  endFixedSession,
  fixedDragSession,
  updateFixedSession,
  type FixedDragMember,
} from './fixedDragStore'
import { measureScale, readBox, roundTo, toPage, type Box, type Point, type Size } from './geometry'
import type { GhostStrategy } from './ghost/strategy'
import { snapWithGuides } from './guides/computeGuides'
import { inheritedDeclarations } from './inheritance'
import { positionDeclarations, withDeclarations } from './position'
import { styleOriginOf } from './transform/elementTransform'
import { unionBoxes } from './transform/groupBox'
import { hasTransformedAncestor, readLayoutBox } from './transform/layoutBox'

export type FixedDragEnv = {
  store: EditorStore
  pageElement: HTMLElement | null
  page: PageSize
  pageContainerId: NodeId
  precision: number
  snapThreshold: number
  keepStacking: boolean
  ghost: GhostStrategy
  layer: HTMLElement | null
}

export type BeginFixedDragArgs = {
  memberIds: readonly NodeId[]
  template: NodeTemplate | null
  element: HTMLElement | null
  input: Input
  grabAtCenter?: boolean
}

const TEMPLATE_SIZE: Size = { width: 160, height: 48 }
const ZERO_ORIGIN: Point = { x: 0, y: 0 }
const DRAGGING_ATTRIBUTE = 'data-adt-fixed-dragging'
const DRAG_ATTRIBUTE = 'data-adt-fixed-drag'

export function scaleOf(env: FixedDragEnv): number {
  const root = env.pageElement
  return root ? measureScale(root.getBoundingClientRect(), env.page.width) : 1
}

export function containerElementOf(env: FixedDragEnv): HTMLElement | null {
  const root = env.pageElement
  if (!root) return null
  if (env.pageContainerId === env.store.state.doc.rootId) return root
  return root.querySelector<HTMLElement>(`[data-adt-id="${env.pageContainerId}"]`) ?? root
}

export function coordinateOriginOf(env: FixedDragEnv): HTMLElement | null {
  const root = env.pageElement
  const container = containerElementOf(env)
  if (!root || !container || container === root) return root
  return getComputedStyle(container).position === 'static' ? root : container
}

function pointerOf(input: Input, origin: HTMLElement, scale: number): Point {
  return toPage({ x: input.clientX, y: input.clientY }, origin.getBoundingClientRect(), scale)
}

function siblingBoxes(
  container: HTMLElement,
  origin: HTMLElement,
  exclude: ReadonlySet<Element>,
  scale: number,
): Box[] {
  const out: Box[] = []
  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement) || !child.hasAttribute('data-adt-id')) continue
    if (exclude.has(child)) continue
    out.push(readBox(child, origin, scale))
  }
  return out
}

function resolveMembers(
  env: FixedDragEnv,
  origin: HTMLElement,
  ids: readonly NodeId[],
): FixedDragMember[] {
  const root = env.pageElement
  if (!root) return []
  const { doc, locked } = env.store.state
  const out: FixedDragMember[] = []
  for (const id of ids) {
    if (locked[id]) continue
    const node = doc.nodes[id]
    if (!node || !isStyled(node)) continue
    const element = root.querySelector<HTMLElement>(`[data-adt-id="${id}"]`)
    if (!element || hasTransformedAncestor(element, root)) continue
    out.push({
      id,
      element,
      style: node.attrs.style,
      origin: readLayoutBox(element, origin),
      styleOrigin: styleOriginOf(element, origin),
    })
  }
  return out
}

export function beginFixedDrag(env: FixedDragEnv, args: BeginFixedDragArgs) {
  const root = env.pageElement
  const origin = coordinateOriginOf(env)
  const container = containerElementOf(env)
  if (!root || !origin || !container) return

  const scale = scaleOf(env)
  const pointer = pointerOf(args.input, origin, scale)
  const members = resolveMembers(env, origin, args.memberIds)
  const measured = unionBoxes(members.map((member) => member.origin))
  const size: Size = measured
    ? { width: measured.width, height: measured.height }
    : { ...TEMPLATE_SIZE }
  const start: Box = measured ?? {
    x: pointer.x - size.width / 2,
    y: pointer.y - size.height / 2,
    ...size,
  }
  const grab: Point =
    args.grabAtCenter || !measured
      ? { x: size.width / 2, y: size.height / 2 }
      : { x: pointer.x - start.x, y: pointer.y - start.y }

  const excluded = new Set<Element>(members.map((member) => member.element))

  beginFixedSession({
    members,
    template: args.template,
    origin: start,
    grab,
    size,
    siblings: siblingBoxes(container, origin, excluded, scale),
    position: { x: start.x, y: start.y },
    guides: [],
  })

  for (const member of members) member.element.setAttribute(DRAGGING_ATTRIBUTE, '')
  root.setAttribute(DRAG_ATTRIBUTE, '')
  if (env.layer) {
    env.ghost.start({
      layer: env.layer,
      origin: start,
      size,
      members: members.length
        ? members.map((member) => ({
            element: member.element,
            offset: { x: member.origin.x - start.x, y: member.origin.y - start.y },
            size: { width: member.origin.width, height: member.origin.height },
          }))
        : [{ element: null, offset: { x: 0, y: 0 }, size }],
    })
  }
  if (env.ghost.hidesNativePreview) preventUnhandled.start()
}

export function moveFixedDrag(env: FixedDragEnv, input: Input) {
  const session = fixedDragSession()
  const origin = coordinateOriginOf(env)
  if (!session || !origin) return

  const scale = scaleOf(env)
  const pointer = pointerOf(input, origin, scale)
  const raw: Box = {
    x: pointer.x - session.grab.x,
    y: pointer.y - session.grab.y,
    ...session.size,
  }
  const threshold = input.altKey ? 0 : env.snapThreshold / scale
  const snapped = snapWithGuides(raw, session.siblings, env.page, threshold)
  const position: Point = {
    x: roundTo(snapped.x, env.precision),
    y: roundTo(snapped.y, env.precision),
  }
  updateFixedSession(position, snapped.guides)
  env.ghost.move(position)
}

function indexAfterTopAncestor(doc: EditorDocument, id: NodeId, containerId: NodeId): number | undefined {
  let current = id
  let parent = doc.nodes[current]?.parentId ?? null
  while (parent && parent !== containerId) {
    current = parent
    parent = doc.nodes[current]?.parentId ?? null
  }
  if (parent !== containerId) return undefined
  const container = doc.nodes[containerId]
  if (!container || container.kind !== 'element') return undefined
  const index = container.children.indexOf(current)
  return index === -1 ? undefined : index + 1
}

export function finishFixedDrag(env: FixedDragEnv, dropped: boolean) {
  const session = fixedDragSession()
  if (!session) return

  for (const member of session.members) member.element.removeAttribute(DRAGGING_ATTRIBUTE)
  env.pageElement?.removeAttribute(DRAG_ATTRIBUTE)
  env.ghost.end({ cancelled: !dropped })
  if (env.ghost.hidesNativePreview) preventUnhandled.stop()
  endFixedSession()
  if (!dropped) return

  const { store } = env
  const { doc } = store.state
  const { position } = session

  if (session.members.length > 0) {
    const delta = { x: position.x - session.origin.x, y: position.y - session.origin.y }
    const single = session.members.length === 1
    const container = containerElementOf(env)
    const updates: PlaceUpdate[] = []

    for (const member of session.members) {
      const node = doc.nodes[member.id]
      if (!node || !isStyled(node)) continue
      const reparent = single && node.parentId !== env.pageContainerId
      let style = node.attrs.style
      if (reparent && container) {
        style = withDeclarations(style, inheritedDeclarations(member.element, container, style))
      }
      const origin = reparent ? ZERO_ORIGIN : member.styleOrigin
      style = positionDeclarations(
        style,
        member.origin.x + delta.x - origin.x,
        member.origin.y + delta.y - origin.y,
        env.precision,
      )
      updates.push({
        id: member.id,
        style,
        parentId: reparent ? env.pageContainerId : undefined,
        index:
          reparent && env.keepStacking
            ? indexAfterTopAncestor(doc, member.id, env.pageContainerId)
            : undefined,
      })
    }

    if (updates.length > 0) store.actions.placeNodes(updates)
    return
  }

  if (session.template) {
    const template: NodeTemplate = {
      ...session.template,
      attrs: {
        ...session.template.attrs,
        style: positionDeclarations(
          session.template.attrs?.style,
          position.x,
          position.y,
          env.precision,
        ),
      },
    }
    const container = doc.nodes[env.pageContainerId]
    const index = container?.kind === 'element' ? container.children.length : 0
    store.actions.insertNode(template, { parentId: env.pageContainerId, index })
  }
}
