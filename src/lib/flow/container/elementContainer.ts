import type { NodeId } from '../../core/ids'
import { isLockedAnywhere, type LockMap } from '../../core/lock'
import type { EditorDocument } from '../../core/model'
import { applyClassEdit } from '../../style/classEdit'
import { BASE_TARGET, matchesTarget, stripVariants } from '../../tailwind/variants'
import { hasLooseText, hasPositionedDescendant, type StyleReader } from '../capabilities'
import { CONTAINER_ATTRIBUTE, isFlowContainer, isImage } from '../component/componentLayout'
import type { FlowAlign } from '../gestures/flowWrite'
import { classFamilies } from '../layout/layoutOperations'

export type ContainerBlock =
  | 'already-container'
  | 'parent-container'
  | 'no-container-parent'
  | 'reordered-row'
  | 'placed'
  | 'positioned-descendant'
  | 'transformed-descendant'
  | 'locked'
  | 'inline'
  | 'loose-text'

export type ContainerSlot = 'row' | 'column' | 'grid'

export type ContainerLock = {
  doc: EditorDocument
  locked: LockMap
  id: NodeId
}

export type ContainerWrapper = {
  classes: string[]
  style: string
}

export type ContainerPlan = {
  slot: ContainerSlot | null
  width: number
  wrapper: ContainerWrapper
  childClasses: string[] | null
}

export type ContainerState = {
  blocked: ContainerBlock | null
  image: boolean
  slot: ContainerSlot | null
}

export type ContainerMessage = {
  title: string
  body: string
}

export const CONTAINER_TAG = 'div'

export const CONTAINER_VALUE = 'true'

const FLEX_DISPLAYS = new Set(['flex', 'inline-flex'])

const GRID_DISPLAYS = new Set(['grid', 'inline-grid'])

const WIDTH_FAMILIES: readonly RegExp[] = [/^w-/, /^min-w-/, /^max-w-/, /^basis-/]

const MARGIN_FAMILIES: readonly RegExp[] = [/^-?m-/, /^-?mx-/, /^-?ml-/, /^-?mr-/]

const SLOT_FAMILIES: readonly RegExp[] = [
  /^self-/,
  /^justify-self-/,
  /^col-/,
  /^row-/,
  /^grow(-|$)/,
  /^shrink(-|$)/,
  /^flex-(\d|auto|initial|none)$/,
]

const CHILD_REMOVE = classFamilies([...WIDTH_FAMILIES, ...MARGIN_FAMILIES, ...SLOT_FAMILIES])

const ALIGN_MARGINS: Record<FlowAlign, string> = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
}

const MARGIN_ALIGNS: Record<string, FlowAlign> = {
  'mr-auto': 'left',
  'mx-auto': 'center',
  'ml-auto': 'right',
}

export const CONTAINER_REASONS: Record<ContainerBlock, string> = {
  'already-container': 'it is already a container',
  'parent-container': 'the box around it is already a container',
  'no-container-parent': 'the parent cannot hold one',
  'reordered-row': 'CSS reorders this row, so the container would land somewhere else',
  placed: 'the grid places this cell by hand',
  'positioned-descendant': 'something inside is positioned by hand',
  'transformed-descendant': 'something inside is transformed',
  locked: 'it is locked',
  inline: 'inline elements follow the text around them',
  'loose-text': 'there is loose text in this slot',
}

const defaultReader: StyleReader = (element) => getComputedStyle(element)

function isSet(value: string | undefined): boolean {
  return Boolean(value) && value !== 'none' && value !== 'normal' && value !== 'auto'
}

function isPlacement(value: string | undefined): boolean {
  if (!value) return false
  return value.split('/').some((part) => {
    const token = part.trim()
    return token !== '' && token !== 'auto'
  })
}

export function slotOf(element: HTMLElement, read: StyleReader = defaultReader): ContainerSlot | null {
  const parent = element.parentElement
  if (!parent) return null
  const style = read(parent)
  if (GRID_DISPLAYS.has(style.display)) return 'grid'
  if (!FLEX_DISPLAYS.has(style.display)) return null
  return (style.flexDirection ?? '').startsWith('column') ? 'column' : 'row'
}

function isReordered(parent: HTMLElement, read: StyleReader): boolean {
  const style = read(parent)
  if ((style.flexDirection ?? '').endsWith('reverse')) return true
  const wrap = style.flexWrap ?? ''
  if (wrap !== '' && wrap !== 'nowrap') return true
  for (const sibling of parent.children) {
    const order = read(sibling).order
    if (isSet(order) && order !== '0') return true
  }
  return false
}

function hasTransformedDescendant(element: HTMLElement, read: StyleReader): boolean {
  for (const descendant of element.querySelectorAll<HTMLElement>('*')) {
    const style = read(descendant)
    if (isSet(style.transform) || isSet(style.rotate) || isSet(style.scale)) return true
  }
  return false
}

function isInlineElement(element: HTMLElement, read: StyleReader): boolean {
  const display = read(element).display
  return display.startsWith('inline') && display !== 'inline-block'
}

/**
 * Whether `element` can be given a `data-responsive-container` of its own, and why not when it
 * cannot. `lock` is optional because the rules themselves only need the DOM.
 */
export function canWrapInContainer(
  element: HTMLElement,
  read: StyleReader = defaultReader,
  lock?: ContainerLock,
): true | ContainerBlock {
  if (lock && isLockedAnywhere(lock.doc, lock.locked, lock.id)) return 'locked'
  if (element.hasAttribute(CONTAINER_ATTRIBUTE)) return 'already-container'

  const parent = element.parentElement
  if (!parent) return 'no-container-parent'
  if (parent.hasAttribute(CONTAINER_ATTRIBUTE)) return 'parent-container'
  if (!isFlowContainer(parent, read)) return 'no-container-parent'

  const slot = slotOf(element, read)
  if (slot !== null && isReordered(parent, read)) return 'reordered-row'
  if (slot === 'grid') {
    const style = read(element)
    if (isPlacement(style.gridColumn) || isPlacement(style.gridRow) || isPlacement(style.gridArea)) {
      return 'placed'
    }
  }

  if (isInlineElement(element, read) && !isImage(element)) return 'inline'
  if (slot !== null && hasLooseText(parent)) return 'loose-text'
  if (hasPositionedDescendant(element, read)) return 'positioned-descendant'
  if (hasTransformedDescendant(element, read)) return 'transformed-descendant'

  return true
}

/** The alignment the element carries today, read from its own base-breakpoint margins. */
export function alignmentOf(classes: readonly string[]): FlowAlign | null {
  for (const className of classes) {
    if (!matchesTarget(className, BASE_TARGET)) continue
    const align = MARGIN_ALIGNS[stripVariants(className)]
    if (align) return align
  }
  return null
}

/**
 * The wrapper to insert and the classes the child keeps. Outside a slot the child is left
 * exactly as it was; inside one it trades its slot box for the width it was measured at.
 */
export function planContainer(
  element: HTMLElement,
  classes: readonly string[],
  read: StyleReader = defaultReader,
): ContainerPlan {
  const slot = slotOf(element, read)
  const width = element.offsetWidth

  if (slot === null) {
    return {
      slot,
      width,
      wrapper: { classes: [], style: 'display:block;width:100%;min-width:0' },
      childClasses: null,
    }
  }

  const alignSelf = read(element).alignSelf ?? ''
  const style =
    alignSelf === '' || alignSelf === 'auto'
      ? 'display:flow-root'
      : `display:flow-root;align-self:${alignSelf}`

  const wrapperClasses = ['w-full', 'min-w-0', 'max-w-full']
  if (slot === 'row') wrapperClasses.push('flex-1')

  const align = alignmentOf(classes)
  const childClasses = applyClassEdit(
    classes,
    {
      remove: CHILD_REMOVE,
      add: [
        `w-[${width}px]`,
        'min-w-0',
        'max-w-full',
        'box-border',
        ...(align === null ? [] : [ALIGN_MARGINS[align]]),
      ],
    },
    BASE_TARGET,
  )

  return { slot, width, wrapper: { classes: wrapperClasses, style }, childClasses }
}

export function containerAttributes(plan: ContainerPlan): Record<string, string> {
  return { [CONTAINER_ATTRIBUTE]: CONTAINER_VALUE, style: plan.wrapper.style }
}

const SUBJECTS = { image: 'This image', element: 'This element' } as const

/** The five readings of the dialog: refused, then image or not crossed with slot or not. */
export function containerMessageOf(state: ContainerState): ContainerMessage {
  const subject = SUBJECTS[state.image ? 'image' : 'element']

  if (state.blocked !== null) {
    return {
      title: 'Cannot wrap this in a container',
      body:
        `${subject} cannot take a container of its own because ` +
        `${CONTAINER_REASONS[state.blocked]}. Select the parent to edit the box it already sits in.`,
    }
  }

  if (state.slot !== null) {
    return {
      title: 'Wrap in container',
      body:
        `${subject} fills a slot its parent decides. A container takes the slot and holds ` +
        `${state.image ? 'the image' : 'the element'} at the width it has now, so resizing it ` +
        'leaves the row or grid exactly where it is.',
    }
  }

  return {
    title: 'Wrap in container',
    body:
      `${subject} shares its width with whatever sits around it. A container gives it a block ` +
      'of its own, so width, spacing and alignment become its own to set.',
  }
}
