import { applyClassEdit } from '../../style/classEdit'
import { matchesTarget, stripVariants, withTarget, type StyleTarget } from '../../tailwind/variants'
import { hasLooseText, hasPositionedDescendant, type StyleReader } from '../capabilities'

export const HEIGHT_TAGS: ReadonlySet<string> = new Set([
  'DIV',
  'HEADER',
  'SECTION',
  'ASIDE',
  'ARTICLE',
])

export const MIN_INNER_SPACE_PX = 0
export const MAX_INNER_SPACE_PX = 160
export const HEIGHT_STEP_PX = 8
export const CONTENT_HINT = 'content needs this space'

export type HeightBlock = 'tag' | 'locked-descendant' | 'positioned-descendant'

export type FramePadding = {
  top: number
  bottom: number
}

export type HeightFrames = {
  frames: readonly HTMLElement[]
  blocked: HeightBlock | null
}

export type HeightFramesOptions = {
  read?: StyleReader
  lockedDescendant?: boolean
}

export type BoxMetrics = {
  fixed: number
  total: number
  natural: number
  padding: readonly FramePadding[]
}

export type HeightMeasure = {
  height: number
  padding: readonly FramePadding[]
  blocked: 'content' | null
}

export type InnerAxis = 'x' | 'y'

const NO_FRAMES: readonly HTMLElement[] = []

const defaultReader: StyleReader = (element) => getComputedStyle(element)

function pxOf(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? '')
  return Number.isFinite(parsed) ? parsed : 0
}

/** A width only counts once a style asks for the border to be drawn. */
function borderOf(style: string | undefined, width: string | undefined): number {
  if (!style || style === 'none' || style === 'hidden') return 0
  return pxOf(width)
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function onlyWrapper(element: HTMLElement): HTMLElement | null {
  if (element.children.length !== 1 || hasLooseText(element)) return null
  const child = element.children[0]
  if (!(child instanceof HTMLElement) || child.tagName !== 'DIV') return null
  return child
}

/**
 * The chain a height edit acts on: the box itself plus the single-child `div` wrappers under
 * it, outermost first. Each level is a frame because its padding is part of the height, and
 * nothing else inside may be disturbed — a locked or hand-positioned descendant refuses.
 */
export function heightFrames(
  element: HTMLElement,
  options: HeightFramesOptions = {},
): HeightFrames {
  if (!HEIGHT_TAGS.has(element.tagName)) return { frames: NO_FRAMES, blocked: 'tag' }
  if (options.lockedDescendant) return { frames: NO_FRAMES, blocked: 'locked-descendant' }

  const read = options.read ?? defaultReader
  if (hasPositionedDescendant(element, read)) {
    return { frames: NO_FRAMES, blocked: 'positioned-descendant' }
  }

  const frames: HTMLElement[] = [element]
  let wrapper = onlyWrapper(element)
  while (wrapper) {
    frames.push(wrapper)
    wrapper = onlyWrapper(wrapper)
  }
  return { frames, blocked: null }
}

/**
 * What the box is made of right now: the part no height can take away (the content and the
 * borders) and the padding of every frame, which a shrink spends first.
 */
export function readBoxMetrics(
  frames: readonly HTMLElement[],
  read: StyleReader = defaultReader,
): BoxMetrics {
  const padding: FramePadding[] = []
  let borders = 0
  let total = 0

  for (const frame of frames) {
    const style = read(frame)
    const entry = { top: pxOf(style.paddingTop), bottom: pxOf(style.paddingBottom) }
    padding.push(entry)
    total += entry.top + entry.bottom
    borders +=
      borderOf(style.borderTopStyle, style.borderTopWidth) +
      borderOf(style.borderBottomStyle, style.borderBottomWidth)
  }

  const inner = frames[frames.length - 1]
  const innerPadding = padding[padding.length - 1]
  const content = inner
    ? Math.max(0, inner.scrollHeight - innerPadding.top - innerPadding.bottom)
    : 0
  const fixed = content + borders

  return { fixed, total, natural: fixed + total, padding }
}

export function measureHeight(metrics: BoxMetrics, requested: number): HeightMeasure {
  const wanted = Math.max(0, Math.round(requested))
  if (wanted >= metrics.natural) {
    return { height: wanted, padding: metrics.padding, blocked: null }
  }

  const room = Math.max(0, wanted - metrics.fixed)
  const factor = metrics.total > 0 ? Math.min(1, room / metrics.total) : 0
  const padding = metrics.padding.map((entry) => ({
    top: round(entry.top * factor),
    bottom: round(entry.bottom * factor),
  }))

  return {
    height: Math.max(wanted, metrics.fixed),
    padding,
    blocked: wanted < metrics.fixed ? 'content' : null,
  }
}

export function heightPreview(height: number, padding: FramePadding): Record<string, string> {
  return {
    height: 'auto',
    'min-height': `${height}px`,
    'max-height': 'none',
    'box-sizing': 'border-box',
    'padding-top': `${padding.top}px`,
    'padding-bottom': `${padding.bottom}px`,
  }
}

export function heightClasses(
  classes: readonly string[],
  height: number,
  target: StyleTarget,
  options: { center: boolean },
): string[] {
  let next = applyClassEdit(classes, { remove: /^h-/, add: ['h-auto'] }, target)
  next = applyClassEdit(next, { remove: /^min-h-/, add: [`min-h-[${height}px]`] }, target)
  next = applyClassEdit(next, { remove: /^max-h-/, add: ['max-h-none'] }, target)
  next = applyClassEdit(next, { remove: /^box-/, add: ['box-border'] }, target)

  if (options.center) {
    next = applyClassEdit(
      next,
      { remove: /^(block|inline|inline-block|flex|grid)$/, add: ['flex'] },
      target,
    )
    next = applyClassEdit(next, { remove: /^flex-(row|col)(-reverse)?$/, add: ['flex-col'] }, target)
    next = applyClassEdit(next, { remove: /^justify-(?!self-)/, add: ['justify-center'] }, target)
  }
  return next
}

/**
 * `p-*` also sets the sides this edit is about, and class order in the attribute does not
 * decide which utility wins — so it is rewritten as the sides it still means.
 */
function expandPadding(classes: readonly string[], axis: InnerAxis, target: StyleTarget): string[] {
  const keep = axis === 'y' ? ['l', 'r'] : ['t', 'b']
  const out: string[] = []

  for (const className of classes) {
    if (!matchesTarget(className, target)) {
      out.push(className)
      continue
    }
    const bare = stripVariants(className)
    const all = bare.match(/^p-(.+)$/)
    if (all) {
      for (const side of keep) out.push(withTarget(`p${side}-${all[1]}`, target))
      continue
    }
    if (axis === 'y' ? /^py-/.test(bare) : /^px-/.test(bare)) continue
    out.push(className)
  }
  return out
}

export function verticalPaddingClasses(
  classes: readonly string[],
  padding: FramePadding,
  target: StyleTarget,
): string[] {
  const expanded = expandPadding(classes, 'y', target)
  const next = applyClassEdit(
    expanded,
    { remove: /^pt-/, add: [`pt-[${padding.top}px]`] },
    target,
  )
  return applyClassEdit(next, { remove: /^pb-/, add: [`pb-[${padding.bottom}px]`] }, target)
}

export function horizontalPaddingClasses(
  classes: readonly string[],
  space: number,
  target: StyleTarget,
): string[] {
  const expanded = expandPadding(classes, 'x', target)
  const next = applyClassEdit(expanded, { remove: /^pl-/, add: [`pl-[${space}px]`] }, target)
  return applyClassEdit(next, { remove: /^pr-/, add: [`pr-[${space}px]`] }, target)
}

export function clampInnerSpace(px: number): number {
  return Math.min(MAX_INNER_SPACE_PX, Math.max(MIN_INNER_SPACE_PX, Math.round(px)))
}

export function innerSpaceClasses(
  classes: readonly string[],
  axis: InnerAxis,
  px: number,
  target: StyleTarget,
): string[] {
  const space = clampInnerSpace(px)
  return axis === 'y'
    ? verticalPaddingClasses(classes, { top: space, bottom: space }, target)
    : horizontalPaddingClasses(classes, space, target)
}
