import type { NodeId } from '../../core/ids'
import { childrenOf, type EditorDocument } from '../../core/model'
import type { EditorActions } from '../../core/store'
import { inheritedDeclarations } from '../../fixed/inheritance'
import { withDeclarations } from '../../fixed/position'
import { applyClassEdit } from '../../style/classEdit'
import { BASE_TARGET } from '../../tailwind/variants'
import type { StyleReader } from '../capabilities'
import {
  FLOW_ROOT_CLASSES,
  floatObjectClasses,
  flowRootClasses,
  textSpacingClasses,
  type FloatSide,
} from '../component/componentCommit'
import { isWrappableObject, layoutChildren } from '../component/componentLayout'
import { classFamilies, LAYOUT_FAMILIES, WIDTH_FAMILIES } from './layoutOperations'

export type TextFlowKind = 'container' | 'surrounding' | 'selected' | 'group'

export type TextFlowPlan = {
  kind: TextFlowKind
  side: FloatSide
  object: HTMLElement
  container: HTMLElement
  anchor: HTMLElement
  createRoot: boolean
  members: HTMLElement[]
  wrappers: HTMLElement[]
  texts: HTMLElement[]
  needSpacing: HTMLElement[]
}

export type TextFlowWrite = {
  actions: EditorActions
  doc: () => EditorDocument
  idOf: (element: HTMLElement) => NodeId | null
  classesOf: (id: NodeId) => readonly string[]
  styleOf: (id: NodeId) => string | undefined
}

const CANVAS_SELECTOR = '[data-adt-canvas]'

const BARRIER_SELECTOR = '[role],[data-activity-item],[data-section-id]'

const TEXT_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'])

const PADDING_SIDES = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const

const BORDER_SIDES = [
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
] as const

const defaultReader: StyleReader = (element) => getComputedStyle(element)

function isSpaced(value: string | undefined): boolean {
  return Number.parseFloat(value || '0') !== 0
}

export function isFlowText(element: Element): boolean {
  return TEXT_TAGS.has(element.tagName)
}

function isDrawnBorder(style: CSSStyleDeclaration): boolean {
  const drawn = style.borderStyle
  if (!drawn || drawn === 'none' || drawn === 'hidden') return false
  return BORDER_SIDES.some((side) => isSpaced(style[side]))
}

export function isLayoutWrapper(element: HTMLElement, read: StyleReader = defaultReader): boolean {
  if (element.tagName !== 'DIV') return false
  if (element.matches(BARRIER_SELECTOR)) return false

  const style = read(element)
  const background = style.backgroundColor
  if (background && background !== 'transparent' && background !== 'rgba(0, 0, 0, 0)') return false
  if (style.backgroundImage && style.backgroundImage !== 'none') return false
  if (isDrawnBorder(style)) return false
  if (style.overflow && style.overflow !== 'visible') return false

  for (const side of PADDING_SIDES) {
    if (isSpaced(style[side])) return false
  }
  return true
}

function textsInside(element: HTMLElement, read: StyleReader): HTMLElement[] {
  const out: HTMLElement[] = []
  for (const child of layoutChildren(element, read)) {
    if (isFlowText(child)) {
      out.push(child)
      continue
    }
    if (isLayoutWrapper(child, read)) out.push(...textsInside(child, read))
  }
  return out
}

function wrappableObjectOf(element: HTMLElement, read: StyleReader): HTMLElement | null {
  if (isWrappableObject(element, read)) return element

  const queue = [...layoutChildren(element, read)]
  while (queue.length > 0) {
    const candidate = queue.shift()
    if (!candidate) break
    if (isWrappableObject(candidate, read)) return candidate
    queue.push(...layoutChildren(candidate, read))
  }
  return null
}

type Level = {
  anchor: HTMLElement
  members: HTMLElement[]
  wrappers: HTMLElement[]
  texts: HTMLElement[]
  outsiders: boolean
}

function levelAt(container: HTMLElement, branch: HTMLElement, read: StyleReader): Level | null {
  const members: HTMLElement[] = []
  const wrappers: HTMLElement[] = []
  const texts: HTMLElement[] = []
  let outsiders = false

  for (const child of layoutChildren(container, read)) {
    if (child === branch) continue

    if (isFlowText(child)) {
      members.push(child)
      texts.push(child)
      continue
    }

    if (isLayoutWrapper(child, read)) {
      const inside = textsInside(child, read)
      if (inside.length > 0) {
        members.push(child)
        wrappers.push(child)
        texts.push(...inside)
        continue
      }
    }

    outsiders = true
  }

  const anchor = members[0]
  if (!anchor || texts.length === 0) return null
  return { anchor, members, wrappers, texts, outsiders }
}

function buildPlan(
  kind: TextFlowKind,
  side: FloatSide,
  object: HTMLElement,
  container: HTMLElement,
  level: Level,
  read: StyleReader,
): TextFlowPlan {
  return {
    kind,
    side,
    object,
    container,
    anchor: level.anchor,
    createRoot: level.outsiders,
    members: level.members,
    wrappers: level.wrappers,
    texts: level.texts,
    needSpacing: level.texts.filter((text) => !isSpaced(read(text).marginBottom)),
  }
}

function groupLevel(
  container: HTMLElement,
  members: readonly HTMLElement[],
  branch: HTMLElement,
  read: StyleReader,
): Level | null {
  const kept: HTMLElement[] = []
  const wrappers: HTMLElement[] = []
  const texts: HTMLElement[] = []
  let outsiders = layoutChildren(container, read).length > members.length

  for (const member of members) {
    if (member === branch) continue

    if (isFlowText(member)) {
      kept.push(member)
      texts.push(member)
      continue
    }

    if (isLayoutWrapper(member, read)) {
      const inside = textsInside(member, read)
      if (inside.length > 0) {
        kept.push(member)
        wrappers.push(member)
        texts.push(...inside)
        continue
      }
    }

    outsiders = true
  }

  const anchor = kept[0]
  if (!anchor || texts.length === 0) return null
  return { anchor, members: kept, wrappers, texts, outsiders }
}

export function groupTextFlow(
  members: readonly HTMLElement[],
  side: FloatSide,
  read: StyleReader = defaultReader,
): TextFlowPlan | null {
  if (members.length < 2) return null

  const container = members[0].parentElement
  if (!container) return null
  if (members.some((member) => member.parentElement !== container)) return null

  let branch: HTMLElement | null = null
  let object: HTMLElement | null = null
  for (const member of members) {
    const found = wrappableObjectOf(member, read)
    if (!found) continue
    branch = member
    object = found
    break
  }
  if (!branch || !object) return null

  const level = groupLevel(container, members, branch, read)
  if (!level) return null
  return buildPlan('group', side, object, container, level, read)
}

export function planTextFlow(
  element: HTMLElement,
  side: FloatSide,
  read: StyleReader = defaultReader,
  anchor?: HTMLElement,
): TextFlowPlan | null {
  const object = wrappableObjectOf(element, read)
  if (!object) return null

  if (anchor) {
    const container = anchor.parentElement
    if (!container) return null
    const branch = object.parentElement === container ? object : anchor
    const level = levelAt(container, branch, read)
    if (!level) return null
    return buildPlan('container', side, object, container, { ...level, anchor }, read)
  }

  const fromContainer = object !== element
  let branch: HTMLElement = object
  let container = object.parentElement
  let climbed = false

  while (container && !container.matches(CANVAS_SELECTOR)) {
    const level = levelAt(container, branch, read)
    if (level) {
      const kind: TextFlowKind = climbed ? (fromContainer ? 'selected' : 'surrounding') : 'container'
      return buildPlan(kind, side, object, container, level, read)
    }
    if (!isLayoutWrapper(container, read)) return null
    branch = container
    container = container.parentElement
    climbed = true
  }

  return null
}

export function textWrapperClasses(classes: readonly string[]): string[] {
  return applyClassEdit(
    classes,
    {
      remove: classFamilies([...LAYOUT_FAMILIES, ...WIDTH_FAMILIES, /^float-/]),
      add: ['block', 'w-auto', 'min-w-0', 'max-w-full'],
    },
    BASE_TARGET,
  )
}

export function applyTextFlow(plan: TextFlowPlan, write: TextFlowWrite): boolean {
  const { actions, doc, idOf, classesOf, styleOf } = write

  const objectId = idOf(plan.object)
  const containerId = idOf(plan.container)
  const anchorId = idOf(plan.anchor)
  if (!objectId || !containerId || !anchorId) return false

  const inherited = inheritedDeclarations(plan.object, plan.container, styleOf(objectId))
  if (inherited.size > 0) {
    actions.setAttr(objectId, 'style', withDeclarations(styleOf(objectId), inherited) || null)
  }

  let rootId = containerId

  if (plan.createRoot) {
    const at = childrenOf(doc(), containerId).indexOf(anchorId)
    if (at < 0) return false

    const inserted = actions.insertNode(
      { tag: 'div', classes: [...FLOW_ROOT_CLASSES] },
      { parentId: containerId, index: at },
    )
    if (!inserted) return false
    rootId = inserted

    let index = 0
    for (const member of plan.members) {
      const memberId = idOf(member)
      if (!memberId) continue
      if (!actions.moveNode(memberId, { parentId: rootId, index })) return false
      index += 1
    }
  } else {
    actions.setClasses(containerId, flowRootClasses(classesOf(containerId)))
  }

  const anchorIndex = childrenOf(doc(), rootId).indexOf(anchorId)
  if (anchorIndex < 0) return false

  const currentParent = doc().nodes[objectId]?.parentId ?? null
  const oldIndex = currentParent ? childrenOf(doc(), currentParent).indexOf(objectId) : -1
  const settled = currentParent === rootId && oldIndex < anchorIndex ? anchorIndex - 1 : anchorIndex
  const placed = currentParent === rootId && settled === oldIndex
  if (!placed && !actions.moveNode(objectId, { parentId: rootId, index: anchorIndex })) return false

  actions.setClasses(objectId, floatObjectClasses(classesOf(objectId), plan.side))

  for (const wrapper of plan.wrappers) {
    const wrapperId = idOf(wrapper)
    if (wrapperId) actions.setClasses(wrapperId, textWrapperClasses(classesOf(wrapperId)))
  }

  for (const text of plan.needSpacing) {
    const textId = idOf(text)
    if (textId) actions.setClasses(textId, textSpacingClasses(classesOf(textId)))
  }

  return true
}
