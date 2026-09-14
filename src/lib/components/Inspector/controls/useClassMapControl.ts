import type { NodeId } from '../../../core/ids'
import { isStyled } from '../../../core/model'
import { stripVariants, variantOf, withVariant, type VariantId } from '../../../tailwind/categories'
import type { ClassMap } from '../../../tailwind/classMaps/types'
import { useEditor, useNode } from '../../Editor/context'

const RESPONSIVE: readonly VariantId[] = ['base', 'sm', 'md', 'lg', 'xl']

export function cascadeOf(variant: VariantId): readonly VariantId[] {
  const index = RESPONSIVE.indexOf(variant)
  if (index >= 0) return RESPONSIVE.slice(0, index + 1).reverse()
  return [variant, 'base']
}

export type ClassMapOverride = {
  variant: VariantId
  classes: string[]
  fallbackVariant: VariantId
  fallbackClasses: string[]
  reset: () => void
}

export type ClassMapControl<TValue> = {
  value: TValue
  isExplicit: boolean
  override: ClassMapOverride | null
  setValue: (next: TValue) => void
  reset: () => void
}

const EMPTY: readonly string[] = []

function fullClassesAt(
  classes: readonly string[],
  variant: VariantId,
  matches: (className: string) => boolean,
): string[] {
  const out: string[] = []
  for (const className of classes) {
    if (variantOf(className) === variant && matches(stripVariants(className))) out.push(className)
  }
  return out
}

function resolveAt<TValue>(
  classes: readonly string[],
  variants: readonly VariantId[],
  classMap: ClassMap<TValue>,
): TValue | null {
  for (const variant of variants) {
    const stripped = fullClassesAt(classes, variant, classMap.matches).map(stripVariants)
    if (stripped.length === 0) continue
    const value = classMap.fromClasses(stripped)
    if (value !== null) return value
  }
  return null
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((entry, index) => entry === b[index])
}

export function useClassMapControl<TValue>(
  id: NodeId,
  classMap: ClassMap<TValue>,
  defaultValue: TValue,
  variant: VariantId,
): ClassMapControl<TValue> {
  const node = useNode(id)
  const { setClasses } = useEditor()
  const classes = node && isStyled(node) ? node.classes : EMPTY

  const cascade = cascadeOf(variant)
  const fallback = cascade.slice(1)
  const resolved = resolveAt(classes, cascade, classMap)

  const withoutCurrent = () =>
    classes.filter((className) => !(variantOf(className) === variant && classMap.matches(stripVariants(className))))

  const reset = () => {
    if (variant === 'base') return
    setClasses(id, withoutCurrent())
  }

  const setValue = (next: TValue) => {
    const stripped = withoutCurrent()
    const fallbackValue = resolveAt(classes, fallback, classMap) ?? defaultValue
    const nextClasses = classMap.toClasses(next)
    const redundant = sameList(classMap.toClasses(fallbackValue), nextClasses)
    if (redundant || nextClasses.length === 0) {
      setClasses(id, stripped)
      return
    }
    setClasses(id, [...stripped, ...nextClasses.map((className) => withVariant(className, variant))])
  }

  let override: ClassMapOverride | null = null
  if (variant !== 'base') {
    const current = fullClassesAt(classes, variant, classMap.matches)
    if (current.length > 0) {
      let fallbackVariant: VariantId = 'base'
      let fallbackClasses: string[] = []
      for (const candidate of fallback) {
        const matched = fullClassesAt(classes, candidate, classMap.matches)
        if (matched.length > 0) {
          fallbackVariant = candidate
          fallbackClasses = matched
          break
        }
      }
      override = { variant, classes: current, fallbackVariant, fallbackClasses, reset }
    }
  }

  return {
    value: resolved ?? defaultValue,
    isExplicit: resolved !== null,
    override,
    setValue,
    reset,
  }
}
