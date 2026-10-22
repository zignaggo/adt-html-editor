export const FLOW_CAPABILITIES = ['align', 'resize', 'space', 'reorder', 'transform'] as const

export type FlowCapability = (typeof FLOW_CAPABILITIES)[number]

export type BlockReason =
  | 'constrained'
  | 'grid-child'
  | 'inline'
  | 'no-box'
  | 'positioned-descendant'
  | 'row-child'
  | 'table'
  | 'transformed'
  | 'unordered-siblings'

export type FlowFlags = {
  image: boolean
  text: boolean
  inline: boolean
  row: boolean
  grid: boolean
  table: boolean
  transformed: boolean
  constrained: boolean
  ordered: boolean
  positionedDescendant: boolean
  box: boolean
}

export type FlowInspection = {
  flags: FlowFlags
  can: Record<FlowCapability, true | BlockReason>
}

export type StyleReader = (element: Element) => CSSStyleDeclaration

const CANVAS_SELECTOR = '[data-adt-canvas]'
const CONTAINER_ATTRIBUTE = 'data-responsive-container'

const TEXT_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI', 'FIGCAPTION', 'DT', 'DD',
])

const TEXT_INLINE_TAGS = new Set([
  'SPAN', 'A', 'STRONG', 'EM', 'B', 'I', 'SMALL', 'CODE', 'LABEL', 'MARK', 'ABBR',
  'CITE', 'Q', 'S', 'U', 'SUB', 'SUP', 'TIME', 'DFN', 'VAR', 'SAMP', 'KBD', 'DEL', 'INS',
])

const IMAGE_TAGS = new Set(['IMG', 'PICTURE', 'SVG', 'VIDEO', 'CANVAS'])

const WRAPPER_TAGS = new Set(['DIV', 'P', 'FIGURE'])

const TABLE_DISPLAYS = new Set([
  'table', 'table-row', 'table-cell', 'table-row-group', 'table-header-group',
  'table-footer-group', 'table-column', 'table-column-group', 'table-caption',
])

const OUT_OF_FLOW = new Set(['absolute', 'fixed', 'sticky'])

const defaultReader: StyleReader = (element) => getComputedStyle(element)

/** An unsupported or unresolved property reads as the empty string, which is not a value. */
function isSet(value: string | undefined): boolean {
  return Boolean(value) && value !== 'none' && value !== 'normal'
}

function isVerticalWriting(mode: string): boolean {
  return mode.startsWith('vertical') || mode.startsWith('sideways')
}

function isTransformedAbove(element: HTMLElement, read: StyleReader): boolean {
  let current: HTMLElement | null = element.parentElement
  while (current && !current.matches(CANVAS_SELECTOR)) {
    const style = read(current)
    if (isSet(style.transform) || isSet(style.rotate) || isSet(style.scale)) return true
    current = current.parentElement
  }
  return false
}

export function hasLooseText(element: Element): boolean {
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim() !== '') return true
  }
  return false
}

export function hasPositionedDescendant(
  element: HTMLElement,
  read: StyleReader = defaultReader,
): boolean {
  for (const descendant of element.querySelectorAll<HTMLElement>('*')) {
    if (OUT_OF_FLOW.has(read(descendant).position)) return true
  }
  return false
}

function siblingsAreOrdered(element: HTMLElement, read: StyleReader): boolean {
  const parent = element.parentElement
  if (!parent) return false
  for (const sibling of parent.children) {
    const style = read(sibling)
    if (isSet(style.order) && style.order !== '0') return false
    if (isSet(style.float)) return false
    if (OUT_OF_FLOW.has(style.position)) return false
  }
  return true
}

function readFlags(element: HTMLElement, read: StyleReader): FlowFlags {
  const style = read(element)
  const parent = element.parentElement
  const parentStyle = parent ? read(parent) : null
  const parentDisplay = parentStyle?.display ?? ''
  const display = style.display
  const image = IMAGE_TAGS.has(element.tagName)

  const row =
    (parentDisplay === 'flex' || parentDisplay === 'inline-flex') &&
    !(parentStyle?.flexDirection ?? '').startsWith('column')

  const constrained =
    isVerticalWriting(style.writingMode ?? '') ||
    isSet(style.float) ||
    OUT_OF_FLOW.has(style.position) ||
    display === 'contents' ||
    (image && parent !== null && hasLooseText(parent))

  return {
    image,
    text: TEXT_TAGS.has(element.tagName) || TEXT_INLINE_TAGS.has(element.tagName),
    inline: display.startsWith('inline') && display !== 'inline-block',
    row,
    grid: parentDisplay === 'grid' || parentDisplay === 'inline-grid',
    table: TABLE_DISPLAYS.has(display) || TABLE_DISPLAYS.has(parentDisplay),
    transformed: isTransformedAbove(element, read),
    constrained,
    ordered: siblingsAreOrdered(element, read),
    positionedDescendant: hasPositionedDescendant(element, read),
    box: display !== 'none',
  }
}

function alignability(flags: FlowFlags): true | BlockReason {
  if (flags.constrained) return 'constrained'
  if (flags.table) return 'table'
  if (flags.inline) return 'inline'
  if (flags.row && !flags.text) return 'row-child'
  return true
}

function sizeability(flags: FlowFlags): true | BlockReason {
  if (flags.constrained) return 'constrained'
  if (flags.transformed) return 'transformed'
  if (flags.table) return 'table'
  if (flags.row) return 'row-child'
  if (flags.grid) return 'grid-child'
  if (flags.inline && !flags.image) return 'inline'
  if (flags.positionedDescendant) return 'positioned-descendant'
  return true
}

function spaceability(flags: FlowFlags): true | BlockReason {
  if (flags.constrained) return 'constrained'
  if (flags.table) return 'table'
  if (flags.row) return 'row-child'
  if (flags.grid) return 'grid-child'
  if (flags.inline && !flags.image) return 'inline'
  return true
}

function reorderability(flags: FlowFlags): true | BlockReason {
  if (flags.constrained) return 'constrained'
  if (flags.table) return 'table'
  if (flags.row) return 'row-child'
  if (flags.grid) return 'grid-child'
  if (flags.inline) return 'inline'
  if (!flags.ordered) return 'unordered-siblings'
  return true
}

/**
 * Free transform paints the element elsewhere without taking it out of the flow, so it asks
 * less than the others: a box of its own, on the two axes the pointer can reach.
 */
function transformability(flags: FlowFlags): true | BlockReason {
  if (!flags.box) return 'no-box'
  if (flags.constrained) return 'constrained'
  if (flags.table) return 'table'
  if (flags.inline) return 'inline'
  if (flags.transformed) return 'transformed'
  return true
}

/**
 * What the direct controls may do to `element`, and why not when they may not. The reason is
 * the payload: it is what the status bar explains instead of a control silently going missing.
 */
export function inspectFlow(
  element: HTMLElement,
  read: StyleReader = defaultReader,
): FlowInspection {
  const flags = readFlags(element, read)

  return {
    flags,
    can: {
      align: alignability(flags),
      resize: sizeability(flags),
      space: spaceability(flags),
      reorder: reorderability(flags),
      transform: transformability(flags),
    },
  }
}

export function allows(inspection: FlowInspection, capability: FlowCapability): boolean {
  return inspection.can[capability] === true
}

export function blockReasonOf(
  inspection: FlowInspection,
  capability: FlowCapability,
): BlockReason | null {
  const entry = inspection.can[capability]
  return entry === true ? null : entry
}

/**
 * The element a reorder actually moves: an image alone in a plain wrapper moves the wrapper,
 * and a single-child container marker moves the container.
 */
export function orderElementOf(element: HTMLElement): HTMLElement {
  let target = element
  const parent = element.parentElement

  if (
    IMAGE_TAGS.has(element.tagName) &&
    parent !== null &&
    WRAPPER_TAGS.has(parent.tagName) &&
    parent.children.length === 1 &&
    !hasLooseText(parent)
  ) {
    target = parent
  }

  const container = target.parentElement
  if (container?.hasAttribute(CONTAINER_ATTRIBUTE) && container.children.length === 1) {
    return container
  }

  return target
}
