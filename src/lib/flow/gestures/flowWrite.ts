import { applyClassEdit } from '../../style/classEdit'
import { writeClassMapValue } from '../../style/classMapWrite'
import { pxToSpacingToken } from '../../tailwind/classMaps/spacingScale'
import { textAlignClassMap } from '../../tailwind/classMaps/typography'
import { stripVariants, withTarget, matchesTarget, type StyleTarget } from '../../tailwind/variants'

export type FlowAlign = 'left' | 'center' | 'right'

export type AlignMode = 'text' | 'box'

export const MIN_WIDTH_PERCENT = 10
export const MAX_WIDTH_PERCENT = 100
export const WIDTH_STEP_PERCENT = 10
export const MAX_SPACE_PX = 96
export const SPACE_STEP_PX = 4
export const TEXT_SIZE_STEP_PX = 2
export const MIN_TEXT_SIZE_PX = 8
export const MAX_TEXT_SIZE_PX = 160

const FONT_SIZE_FAMILY = /^text-(xs|sm|base|lg|xl|[2-9]xl|\[[\d.]+(?:px|rem|em)\])$/
const DEFAULT_ROOT_PX = 16

const JUSTIFY_SELF: Record<FlowAlign, string> = {
  left: 'start',
  center: 'center',
  right: 'end',
}

export function alignFromThirds(centerX: number, parentLeft: number, parentWidth: number): FlowAlign {
  if (parentWidth <= 0) return 'left'
  const ratio = (centerX - parentLeft) / parentWidth
  if (ratio < 1 / 3) return 'left'
  if (ratio > 2 / 3) return 'right'
  return 'center'
}

export function clampWidthPercent(percent: number): number {
  return Math.min(MAX_WIDTH_PERCENT, Math.max(MIN_WIDTH_PERCENT, Math.round(percent)))
}

export function clampSpacePx(px: number): number {
  const stepped = Math.round(px / SPACE_STEP_PX) * SPACE_STEP_PX
  return Math.min(MAX_SPACE_PX, Math.max(0, stepped))
}

export function alignPreview(
  align: FlowAlign,
  mode: AlignMode,
  options: { grid: boolean; blockify: boolean },
): Record<string, string> {
  if (mode === 'text') return { 'text-align': align }

  const props: Record<string, string> = {
    'margin-left': align === 'left' ? '0' : 'auto',
    'margin-right': align === 'right' ? '0' : 'auto',
  }
  if (options.grid) props['justify-self'] = JUSTIFY_SELF[align]
  if (options.blockify) props.display = 'block'
  return props
}

export function alignClasses(
  classes: readonly string[],
  align: FlowAlign,
  mode: AlignMode,
  target: StyleTarget,
  options: { grid: boolean; blockify: boolean },
): string[] {
  if (mode === 'text') {
    return writeClassMapValue(classes, textAlignClassMap, align, target, 'left')
  }

  const margins = align === 'center' ? ['mx-auto'] : align === 'right' ? ['ml-auto'] : ['mr-auto']
  let next = applyClassEdit(classes, { remove: /^(ml|mr|mx)-auto$/, add: margins }, target)

  if (options.grid) {
    next = applyClassEdit(
      next,
      { remove: /^justify-self-/, add: [`justify-self-${JUSTIFY_SELF[align]}`] },
      target,
    )
  }
  if (options.blockify) {
    next = applyClassEdit(next, { remove: /^(block|inline|inline-block|flex|grid)$/, add: ['block'] }, target)
  }
  return next
}

export function widthPreview(percent: number, image: boolean): Record<string, string> {
  const props: Record<string, string> = {
    width: `${percent}%`,
    'max-width': '100%',
    'min-width': '0',
    'box-sizing': 'border-box',
  }
  if (image) {
    props.height = 'auto'
    props['min-height'] = '0'
    props['max-height'] = 'none'
    props.display = 'block'
  }
  return props
}

export function widthClasses(
  classes: readonly string[],
  percent: number,
  image: boolean,
  target: StyleTarget,
): string[] {
  const width = percent >= MAX_WIDTH_PERCENT ? 'w-full' : `w-[${percent}%]`
  let next = applyClassEdit(classes, { remove: /^w-/, add: [width] }, target)
  next = applyClassEdit(next, { remove: /^max-w-/, add: ['max-w-full'] }, target)
  next = applyClassEdit(next, { remove: /^min-w-/, add: ['min-w-0'] }, target)
  next = applyClassEdit(next, { remove: /^box-/, add: ['box-border'] }, target)

  if (image) {
    next = applyClassEdit(next, { remove: /^h-/, add: ['h-auto'] }, target)
    next = applyClassEdit(next, { remove: /^min-h-/, add: ['min-h-0'] }, target)
    next = applyClassEdit(next, { remove: /^max-h-/, add: ['max-h-none'] }, target)
  }
  return next
}

export function clampTextSizePx(px: number): number {
  return Math.min(MAX_TEXT_SIZE_PX, Math.max(MIN_TEXT_SIZE_PX, Math.round(px)))
}

/**
 * Text sizes are written relative to the root so the page keeps scaling with the reader's
 * own font size, which a pixel value would pin down.
 */
export function remOf(px: number, rootPx: number): string {
  const root = rootPx > 0 ? rootPx : DEFAULT_ROOT_PX
  return `${Number.parseFloat((px / root).toFixed(4))}rem`
}

export function textSizePreview(px: number, rootPx: number): Record<string, string> {
  return { 'font-size': remOf(px, rootPx) }
}

export function textSizeClasses(
  classes: readonly string[],
  px: number,
  rootPx: number,
  target: StyleTarget,
): string[] {
  return applyClassEdit(
    classes,
    { remove: FONT_SIZE_FAMILY, add: [`text-[${remOf(px, rootPx)}]`] },
    target,
  )
}

export function spacePreview(px: number): Record<string, string> {
  return { 'margin-bottom': `${px}px` }
}

/**
 * `m-*` and `my-*` also set the bottom margin, and class order in the attribute does not
 * decide which utility wins — so they are rewritten as the sides they still mean.
 */
function expandBottomMargin(classes: readonly string[], target: StyleTarget): string[] {
  const out: string[] = []
  for (const className of classes) {
    if (!matchesTarget(className, target)) {
      out.push(className)
      continue
    }
    const bare = stripVariants(className)
    const all = bare.match(/^(-?)m-(.+)$/)
    if (all) {
      for (const side of ['t', 'r', 'l']) {
        out.push(withTarget(`${all[1]}m${side}-${all[2]}`, target))
      }
      continue
    }
    const axis = bare.match(/^(-?)my-(.+)$/)
    if (axis) {
      out.push(withTarget(`${axis[1]}mt-${axis[2]}`, target))
      continue
    }
    out.push(className)
  }
  return out
}

export function spaceClasses(
  classes: readonly string[],
  px: number,
  target: StyleTarget,
): string[] {
  const expanded = expandBottomMargin(classes, target)
  return applyClassEdit(
    expanded,
    { remove: /^-?mb-/, add: [`mb-${pxToSpacingToken(px)}`] },
    target,
  )
}
