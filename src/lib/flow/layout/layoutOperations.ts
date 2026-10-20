import type { ClassMatcher } from '../../style/classEdit'
import { applyClassEdit } from '../../style/classEdit'
import { clearInlineProps } from '../../style/commit'
import { stripVariants, type StyleTarget } from '../../tailwind/variants'

export type LayoutEdit = {
  remove?: ClassMatcher
  add?: readonly string[]
  at?: StyleTarget
}

export type LayoutSource = {
  classes: readonly string[]
  style?: string | undefined
}

export type LayoutWrite = {
  classes: string[]
  style?: string | null
}

const SPACING_PROPERTIES: Record<string, readonly string[]> = {
  m: ['margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  mx: ['margin-left', 'margin-right'],
  my: ['margin-top', 'margin-bottom'],
  mt: ['margin-top'],
  mr: ['margin-right'],
  mb: ['margin-bottom'],
  ml: ['margin-left'],
  p: ['padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  px: ['padding-left', 'padding-right'],
  py: ['padding-top', 'padding-bottom'],
  pt: ['padding-top'],
  pr: ['padding-right'],
  pb: ['padding-bottom'],
  pl: ['padding-left'],
}

const SPACING_PATTERN = /^-?(m|mx|my|mt|mr|mb|ml|p|px|py|pt|pr|pb|pl)-/

const INLINE_PROPERTIES: ReadonlyArray<readonly [RegExp, readonly string[]]> = [
  [/^(block|flex|grid|inline|inline-block|inline-flex|inline-grid|flow-root|contents|hidden)$/, ['display']],
  [/^flex-(row|col)/, ['flex-direction']],
  [/^flex-(wrap|nowrap)/, ['flex-wrap']],
  [/^justify-items-/, ['justify-items']],
  [/^justify-self-/, ['justify-self']],
  [/^justify-/, ['justify-content']],
  [/^items-/, ['align-items']],
  [/^self-/, ['align-self']],
  [/^gap-x-/, ['column-gap']],
  [/^gap-y-/, ['row-gap']],
  [/^gap-/, ['gap', 'row-gap', 'column-gap']],
  [/^grid-cols-/, ['grid-template-columns']],
  [/^grid-rows-/, ['grid-template-rows']],
  [/^col-/, ['grid-column']],
  [/^row-/, ['grid-row']],
  [/^min-w-/, ['min-width']],
  [/^max-w-/, ['max-width']],
  [/^w-/, ['width']],
  [/^min-h-/, ['min-height']],
  [/^max-h-/, ['max-height']],
  [/^h-/, ['height']],
  [/^shrink(-|$)/, ['flex-shrink']],
  [/^grow(-|$)/, ['flex-grow']],
  [/^basis-/, ['flex-basis']],
  [/^float-/, ['float']],
  [/^clear-/, ['clear']],
  [/^text-(left|center|right|justify)$/, ['text-align']],
  [/^break-(words|all|normal)$/, ['overflow-wrap', 'word-break']],
  [/^overflow-/, ['overflow']],
]

export function classFamilies(patterns: readonly RegExp[]): (className: string) => boolean {
  return (className) => patterns.some((pattern) => pattern.test(className))
}

export function inlinePropertiesOf(classes: readonly string[]): string[] {
  const out = new Set<string>()
  for (const className of classes) {
    const utility = stripVariants(className)
    const spacing = SPACING_PATTERN.exec(utility)
    if (spacing) {
      for (const property of SPACING_PROPERTIES[spacing[1]] ?? []) out.add(property)
      continue
    }
    for (const [pattern, properties] of INLINE_PROPERTIES) {
      if (!pattern.test(utility)) continue
      for (const property of properties) out.add(property)
      break
    }
  }
  return [...out]
}

export function updateLayout(
  source: LayoutSource,
  edits: readonly LayoutEdit[],
  target: StyleTarget,
): LayoutWrite {
  let classes: string[] = [...source.classes]
  const added: string[] = []

  for (const edit of edits) {
    classes = applyClassEdit(classes, { remove: edit.remove, add: edit.add }, edit.at ?? target)
    for (const className of edit.add ?? []) added.push(className)
  }

  const cleared = clearInlineProps(source.style, inlinePropertiesOf(added))
  const next = cleared ?? null
  const before = source.style ?? null

  return next === before ? { classes } : { classes, style: next }
}

export const LAYOUT_FAMILIES: readonly RegExp[] = [
  /^(flex|grid|block|inline|inline-block|inline-flex|inline-grid|flow-root|contents|hidden)$/,
  /^flex-/,
  /^grid-/,
  /^items-/,
  /^justify-/,
  /^gap-/,
  /^col-/,
  /^row-/,
]

export const WIDTH_FAMILIES: readonly RegExp[] = [/^w-/, /^min-w-/, /^max-w-/, /^basis-/]

export const CHILD_BOX_FAMILIES: readonly RegExp[] = [
  ...WIDTH_FAMILIES,
  /^float-/,
  /^col-/,
  /^row-/,
  /^self-/,
  /^justify-self-/,
  /^grow(-|$)/,
  /^shrink(-|$)/,
]
