import type { Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled'
import type { NodeId } from '../core/ids'
import { isStyled, type EditorDocument } from '../core/model'
import type { EditorStore, NodeTemplate } from '../core/store'
import type { PageSize } from './detect'
import {
  beginFixedSession,
  endFixedSession,
  fixedDragSession,
  updateFixedSession,
} from './fixedDragStore'
import { measureScale, readBox, roundTo, toPage, type Box, type Point, type Size } from './geometry'
import type { GhostStrategy } from './ghost/strategy'
import { snapWithGuides } from './guides/computeGuides'
import { inheritedDeclarations } from './inheritance'
import { positionDeclarations, withDeclarations } from './position'

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
  nodeId: NodeId | null
  template: NodeTemplate | null
  element: HTMLElement | null
  input: Input
  grabAtCenter?: boolean
}

const TEMPLATE_SIZE: Size = { width: 160, height: 48 }
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
  exclude: HTMLElement | null,
  scale: number,
): Box[] {
  const out: Box[] = []
  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement) || !child.hasAttribute('data-adt-id')) continue
    if (child === exclude) continue
    out.push(readBox(child, origin, scale))
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
  const measured = args.element ? readBox(args.element, origin, scale) : null
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

  beginFixedSession({
    nodeId: args.nodeId,
    template: args.template,
    sourceElement: args.element,
    origin: start,
    grab,
    size,
    siblings: siblingBoxes(container, origin, args.element, scale),
    position: { x: start.x, y: start.y },
    guides: [],
  })

  args.element?.setAttribute(DRAGGING_ATTRIBUTE, '')
  root.setAttribute(DRAG_ATTRIBUTE, '')
  if (env.layer) env.ghost.start({ element: args.element, layer: env.layer, origin: start, size })
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

  session.sourceElement?.removeAttribute(DRAGGING_ATTRIBUTE)
  env.pageElement?.removeAttribute(DRAG_ATTRIBUTE)
  env.ghost.end({ cancelled: !dropped })
  if (env.ghost.hidesNativePreview) preventUnhandled.stop()
  endFixedSession()
  if (!dropped) return

  const { store } = env
  const { doc } = store.state
  const { position } = session

  if (session.nodeId) {
    const node = doc.nodes[session.nodeId]
    if (!node || !isStyled(node)) return
    let style = node.attrs.style
    const reparent = node.parentId !== env.pageContainerId
    if (reparent && session.sourceElement) {
      const container = containerElementOf(env)
      if (container) {
        style = withDeclarations(style, inheritedDeclarations(session.sourceElement, container, style))
      }
    }
    style = positionDeclarations(style, position.x, position.y, env.precision)
    store.actions.placeNode(session.nodeId, {
      style,
      parentId: reparent ? env.pageContainerId : undefined,
      index:
        reparent && env.keepStacking
          ? indexAfterTopAncestor(doc, session.nodeId, env.pageContainerId)
          : undefined,
    })
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
