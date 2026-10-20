import { applyClassEdit } from '../../style/classEdit'
import { BASE_TARGET, MOBILE_TARGET, type StyleTarget } from '../../tailwind/variants'

export type FloatSide = 'left' | 'right'

export const COLUMNS_CLASSES: readonly string[] = [
  'grid',
  'grid-cols-2',
  'max-sm:grid-cols-1',
  'gap-6',
  'items-start',
  'clear-both',
  'w-full',
]

export const FLOW_ROOT_CLASSES: readonly string[] = ['flow-root', 'w-full', 'min-w-0']

const BOX_FAMILIES = [
  /^-?m[xytrbl]?-/,
  /^w-/,
  /^min-w-/,
  /^max-w-/,
  /^float-/,
  /^col-/,
  /^row-/,
  /^self-/,
  /^justify-self-/,
  /^basis-/,
  /^grow(-|$)/,
  /^shrink(-|$)/,
]

const PADDING_FAMILY = /^-?p[xytrbl]?-/

const LAYOUT_FAMILIES = [
  /^(flex|grid|block|inline|inline-block|inline-flex|inline-grid|flow-root|contents|hidden)$/,
  /^flex-/,
  /^grid-/,
  /^items-/,
  /^justify-/,
  /^gap-/,
  /^col-/,
  /^row-/,
]

function matchesAny(patterns: readonly RegExp[]): (className: string) => boolean {
  return (className) => patterns.some((pattern) => pattern.test(className))
}

/**
 * Makes a child fill the slot it was just dropped into: the box properties it carried from
 * its old parent would fight the new one, so they go.
 */
export function fitClasses(
  classes: readonly string[],
  target: StyleTarget,
  options: { stripPadding?: boolean } = {},
): string[] {
  const families = options.stripPadding ? [...BOX_FAMILIES, PADDING_FAMILY] : BOX_FAMILIES
  return applyClassEdit(
    classes,
    { remove: matchesAny(families), add: ['w-full', 'min-w-0', 'max-w-full'] },
    target,
  )
}

export function floatObjectClasses(classes: readonly string[], side: FloatSide): string[] {
  const margin = side === 'left' ? 'mr-6' : 'ml-6'
  const base = applyClassEdit(
    classes,
    {
      remove: matchesAny([/^float-/, /^w-/, /^max-w-/, /^-?m[xrl]-/]),
      add: ['w-1/3', 'max-w-full', `float-${side}`, margin],
    },
    BASE_TARGET,
  )

  return applyClassEdit(
    base,
    {
      remove: matchesAny([/^float-/, /^w-/, /^-?m[xrl]-/]),
      add: ['float-none', 'w-full', side === 'left' ? 'mr-0' : 'ml-0'],
    },
    MOBILE_TARGET,
  )
}

export function flowRootClasses(classes: readonly string[]): string[] {
  return applyClassEdit(
    classes,
    { remove: matchesAny(LAYOUT_FAMILIES), add: [...FLOW_ROOT_CLASSES] },
    BASE_TARGET,
  )
}

export function textSpacingClasses(classes: readonly string[]): string[] {
  return applyClassEdit(classes, { remove: /^-?mb-/, add: ['mb-6'] }, BASE_TARGET)
}
