import { matchesTarget, stripVariants, withTarget, type StyleTarget } from '../tailwind/variants'

export type ClassMatcher = RegExp | ((className: string) => boolean)

export type ClassEdit = {
  remove?: ClassMatcher
  add?: readonly string[]
}

function matched(matcher: ClassMatcher, className: string): boolean {
  if (typeof matcher === 'function') return matcher(className)
  matcher.lastIndex = 0
  return matcher.test(className)
}

/**
 * Rewrites one family of utilities at a single breakpoint/state target: classes carrying
 * another target are left untouched, so an edit at `max-sm` never erases the desktop value.
 */
export function applyClassEdit(
  classes: readonly string[],
  edit: ClassEdit,
  target: StyleTarget,
): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  const push = (className: string) => {
    if (seen.has(className)) return
    seen.add(className)
    out.push(className)
  }

  for (const className of classes) {
    const drop =
      edit.remove !== undefined &&
      matchesTarget(className, target) &&
      matched(edit.remove, stripVariants(className))
    if (!drop) push(className)
  }

  for (const className of edit.add ?? []) push(withTarget(className, target))

  return out
}

export function removeClassFamily(
  classes: readonly string[],
  remove: ClassMatcher,
  target: StyleTarget,
): string[] {
  return applyClassEdit(classes, { remove }, target)
}
