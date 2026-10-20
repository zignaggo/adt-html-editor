import type { ClassMap } from '../tailwind/classMaps/types'
import {
  cascadeOf,
  matchesTarget,
  stripVariants,
  withTarget,
  type StyleTarget,
} from '../tailwind/variants'

export function classesAt(
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

export function resolveClassMapAt<TValue>(
  classes: readonly string[],
  targets: readonly StyleTarget[],
  classMap: ClassMap<TValue>,
): TValue | null {
  for (const target of targets) {
    const stripped = classesAt(classes, target, classMap.matches).map(stripVariants)
    if (stripped.length === 0) continue
    const value = classMap.fromClasses(stripped)
    if (value !== null) return value
  }
  return null
}

export function readClassMapValue<TValue>(
  classes: readonly string[],
  classMap: ClassMap<TValue>,
  target: StyleTarget,
): TValue | null {
  return resolveClassMapAt(classes, cascadeOf(target), classMap)
}

export function clearClassMapValue<TValue>(
  classes: readonly string[],
  classMap: ClassMap<TValue>,
  target: StyleTarget,
): string[] {
  return classes.filter(
    (className) => !(matchesTarget(className, target) && classMap.matches(stripVariants(className))),
  )
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((entry, index) => entry === b[index])
}

/**
 * Next class list for `value` at `target`. An override that would repeat what the wider
 * breakpoints already resolve to is dropped instead of written.
 */
export function writeClassMapValue<TValue>(
  classes: readonly string[],
  classMap: ClassMap<TValue>,
  value: TValue,
  target: StyleTarget,
  defaultValue: TValue,
): string[] {
  const stripped = clearClassMapValue(classes, classMap, target)
  const fallbackValue =
    resolveClassMapAt(classes, cascadeOf(target).slice(1), classMap) ?? defaultValue
  const nextClasses = classMap.toClasses(value)
  if (nextClasses.length === 0 || sameList(classMap.toClasses(fallbackValue), nextClasses)) {
    return stripped
  }
  return [...stripped, ...nextClasses.map((className) => withTarget(className, target))]
}
