import type { NodeId } from '../../../core/ids'
import { isStyled } from '../../../core/model'
import type { ClassMap } from '../../../tailwind/classMaps/types'
import {
  BASE_TARGET,
  cascadeOf,
  matchesTarget,
  sameTarget,
  stripVariants,
  withTarget,
  type StyleTarget,
} from '../../../tailwind/variants'
import { useEditor, useNode } from '../../Editor/context'

export type ClassMapOverride = {
  target: StyleTarget
  classes: string[]
  fallbackTarget: StyleTarget
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
  target: StyleTarget,
  matches: (className: string) => boolean,
): string[] {
  const out: string[] = []
  for (const className of classes) {
    if (matchesTarget(className, target) && matches(stripVariants(className))) out.push(className)
  }
  return out
}

function resolveAt<TValue>(
  classes: readonly string[],
  targets: readonly StyleTarget[],
  classMap: ClassMap<TValue>,
): TValue | null {
  for (const target of targets) {
    const stripped = fullClassesAt(classes, target, classMap.matches).map(stripVariants)
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
  target: StyleTarget,
): ClassMapControl<TValue> {
  const node = useNode(id)
  const { setClasses } = useEditor()
  const classes = node && isStyled(node) ? node.classes : EMPTY

  const cascade = cascadeOf(target)
  const fallback = cascade.slice(1)
  const resolved = resolveAt(classes, cascade, classMap)
  const isBase = sameTarget(target, BASE_TARGET)

  const withoutCurrent = () =>
    classes.filter((className) => !(matchesTarget(className, target) && classMap.matches(stripVariants(className))))

  const reset = () => {
    if (isBase) return
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
    setClasses(id, [...stripped, ...nextClasses.map((className) => withTarget(className, target))])
  }

  let override: ClassMapOverride | null = null
  if (!isBase) {
    const current = fullClassesAt(classes, target, classMap.matches)
    if (current.length > 0) {
      let fallbackTarget: StyleTarget = BASE_TARGET
      let fallbackClasses: string[] = []
      for (const candidate of fallback) {
        const matched = fullClassesAt(classes, candidate, classMap.matches)
        if (matched.length > 0) {
          fallbackTarget = candidate
          fallbackClasses = matched
          break
        }
      }
      override = { target, classes: current, fallbackTarget, fallbackClasses, reset }
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
