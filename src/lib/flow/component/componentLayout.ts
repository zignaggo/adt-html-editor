import type { StyleReader } from '../capabilities'

export type ComponentBlock =
  | 'unsupported-tag'
  | 'phrase-ancestor'
  | 'list-ancestor'
  | 'transformed'
  | 'vertical-writing'
  | 'table'
  | 'contents'
  | 'placed'
  | 'reversed-parent'

export const CONTAINER_ATTRIBUTE = 'data-responsive-container'

const CANVAS_SELECTOR = '[data-adt-canvas]'

const MOVABLE_TAGS = new Set([
  'DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'FIGURE', 'HEADER', 'FOOTER', 'NAV', 'MAIN',
  'BLOCKQUOTE', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'DL', 'PRE',
  'TABLE', 'IMG', 'PICTURE', 'VIDEO', 'FORM', 'HR',
])

const PHRASE_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'A', 'LABEL', 'BUTTON',
  'FIGCAPTION', 'DT', 'DD', 'BLOCKQUOTE', 'EM', 'STRONG',
])

const LIST_TAGS = new Set(['UL', 'OL', 'DL', 'LI'])

const CAPTION_TAGS = new Set(['FIGCAPTION', 'SMALL', 'CAPTION'])

const IMAGE_TAGS = new Set(['IMG', 'PICTURE', 'SVG', 'VIDEO', 'CANVAS'])

const WRAPPER_TAGS = new Set(['DIV', 'P', 'FIGURE'])

const GROUP_TAGS = new Set(['DIV', 'FIGURE'])

const TABLE_DISPLAYS = new Set([
  'table', 'table-row', 'table-cell', 'table-row-group', 'table-header-group',
  'table-footer-group', 'table-column', 'table-column-group', 'table-caption',
])

const CONTAINER_DISPLAYS = new Set(['block', 'flex', 'grid', 'flow-root', 'list-item'])

const OUT_OF_FLOW = new Set(['absolute', 'fixed', 'sticky'])

const defaultReader: StyleReader = (element) => getComputedStyle(element)

function isSet(value: string | undefined): boolean {
  return Boolean(value) && value !== 'none' && value !== 'normal' && value !== 'auto'
}

export function isImage(element: Element): boolean {
  return IMAGE_TAGS.has(element.tagName)
}

function hasLooseText(element: Element): boolean {
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim() !== '') return true
  }
  return false
}

function isPositioned(element: Element, read: StyleReader): boolean {
  return OUT_OF_FLOW.has(read(element).position)
}

/**
 * An image with its caption and at most one paragraph of its own: a diagram's positioned
 * labels are allowed, because they travel with it.
 */
export function isMediaGroup(element: Element, read: StyleReader = defaultReader): boolean {
  if (!GROUP_TAGS.has(element.tagName)) return false

  let images = 0
  let paragraphs = 0

  for (const child of element.children) {
    if (isImage(child)) {
      images += 1
      continue
    }
    if (CAPTION_TAGS.has(child.tagName)) continue
    if (isPositioned(child, read)) continue
    if (child.tagName === 'P') {
      paragraphs += 1
      continue
    }
    return false
  }

  return images === 1 && paragraphs <= 1
}

function paragraphOfImage(element: HTMLElement): HTMLElement | null {
  const parent = element.parentElement
  if (!parent || parent.tagName !== 'P') return null
  return parent.children.length === 1 && !hasLooseText(parent) ? parent : null
}

function withContainer(element: HTMLElement): HTMLElement {
  const parent = element.parentElement
  if (parent?.hasAttribute(CONTAINER_ATTRIBUTE) && parent.children.length === 1) return parent
  return element
}

/**
 * Promotes a selection to the thing a reader would call one piece: the figure or aside around
 * it, the paragraph an inline sits in, or the image's own wrapper.
 */
export function componentOf(element: HTMLElement, read: StyleReader = defaultReader): HTMLElement {
  const canvas = element.closest(CANVAS_SELECTOR)

  const framed = element.closest<HTMLElement>('figure,aside')
  if (framed && canvas?.contains(framed)) return withContainer(framed)

  if (read(element).display.startsWith('inline') && !isImage(element)) {
    const phrase = element.parentElement?.closest<HTMLElement>('p,h1,h2,h3,h4,h5,h6')
    if (phrase && canvas?.contains(phrase)) return withContainer(phrase)
  }

  if (isImage(element)) {
    const paragraph = paragraphOfImage(element)
    if (paragraph) return withContainer(paragraph)

    let group: HTMLElement | null = element.parentElement
    while (group && canvas?.contains(group) && isMediaGroup(group, read)) {
      const next: HTMLElement | null = group.parentElement
      if (!next || !canvas.contains(next) || !isMediaGroup(next, read)) break
      group = next
    }
    if (group && canvas?.contains(group) && isMediaGroup(group, read)) return withContainer(group)
  }

  return withContainer(element)
}

function phraseOrListAncestor(element: HTMLElement): ComponentBlock | null {
  let current = element.parentElement
  while (current && !current.matches(CANVAS_SELECTOR)) {
    if (PHRASE_TAGS.has(current.tagName)) return 'phrase-ancestor'
    if (LIST_TAGS.has(current.tagName)) return 'list-ancestor'
    current = current.parentElement
  }
  return null
}

function transformedAbove(element: HTMLElement, read: StyleReader): boolean {
  let current: HTMLElement | null = element.parentElement
  while (current && !current.matches(CANVAS_SELECTOR)) {
    const style = read(current)
    if (isSet(style.transform) || isSet(style.rotate) || isSet(style.scale)) return true
    current = current.parentElement
  }
  return false
}

/** Why `element` cannot be repositioned as a whole, or `null` when it can. */
export function componentBlock(
  element: HTMLElement,
  read: StyleReader = defaultReader,
): ComponentBlock | null {
  if (!MOVABLE_TAGS.has(element.tagName)) return 'unsupported-tag'

  const ancestor = phraseOrListAncestor(element)
  if (ancestor) return ancestor

  const style = read(element)
  if (style.display === 'contents') return 'contents'
  if (TABLE_DISPLAYS.has(style.display)) return 'table'
  if ((style.writingMode ?? '').startsWith('vertical')) return 'vertical-writing'
  if (transformedAbove(element, read)) return 'transformed'
  if (isSet(style.order) && style.order !== '0') return 'placed'
  if (isSet(style.gridColumn) || isSet(style.gridRow)) return 'placed'

  const parent = element.parentElement
  if (parent) {
    const parentStyle = read(parent)
    if ((parentStyle.flexDirection ?? '').endsWith('reverse')) return 'reversed-parent'
    if ((parentStyle.gridAutoFlow ?? '').includes('dense')) return 'reversed-parent'
  }

  return null
}

export function movableComponent(
  element: HTMLElement,
  read: StyleReader = defaultReader,
): HTMLElement | null {
  const component = componentOf(element, read)
  return componentBlock(component, read) === null ? component : null
}

/** An element that can take a dropped component as a child. */
export function isFlowContainer(element: Element, read: StyleReader = defaultReader): boolean {
  if (isImage(element) || element.tagName === 'BR' || element.tagName === 'HR') return false
  if (LIST_TAGS.has(element.tagName) || element.tagName === 'TABLE') return false
  const style = read(element)
  if (TABLE_DISPLAYS.has(style.display)) return false
  return CONTAINER_DISPLAYS.has(style.display)
}

/** Element children that take part in the layout, in document order. */
export function layoutChildren(container: Element, read: StyleReader = defaultReader): HTMLElement[] {
  const out: HTMLElement[] = []
  for (const child of container.children) {
    if (!(child instanceof HTMLElement)) continue
    if (isPositioned(child, read)) continue
    out.push(child)
  }
  return out
}

/** An object text can wrap around. */
export function isWrappableObject(element: HTMLElement, read: StyleReader = defaultReader): boolean {
  if (element.tagName === 'ASIDE' || element.tagName === 'FIGURE') return true
  if (isImage(element)) return true
  if (isMediaGroup(element, read)) return true
  return isSet(read(element).float)
}

/**
 * What the pointer router treats as a whole piece rather than a block in the flow: the
 * sectioning tags, and a div that reads as a card, a figure group or a floated object.
 */
export function looksLikeComponent(element: HTMLElement, read: StyleReader = defaultReader): boolean {
  if (element.tagName === 'ASIDE' || element.tagName === 'FIGURE') return true
  if (element.tagName === 'HEADER' || element.tagName === 'FOOTER') return true
  if (element.tagName !== 'DIV') return false
  if (element.hasAttribute(CONTAINER_ATTRIBUTE)) return true
  if (isMediaGroup(element, read)) return true

  const style = read(element)
  if (isSet(style.float)) return true
  if (isSet(style.boxShadow)) return true
  if (style.borderStyle !== 'none' && style.borderStyle !== '') return true
  const background = style.backgroundColor
  return Boolean(background) && background !== 'transparent' && background !== 'rgba(0, 0, 0, 0)'
}

export function isParagraph(element: Element): boolean {
  return element.tagName === 'P'
}

export function wrapperOfImage(element: HTMLElement): HTMLElement | null {
  const parent = element.parentElement
  if (!parent || !WRAPPER_TAGS.has(parent.tagName)) return null
  return parent.children.length === 1 && !hasLooseText(parent) ? parent : null
}
