export const STATE_VARIANTS = ['hover', 'focus', 'active', 'dark'] as const
export type StateVariant = (typeof STATE_VARIANTS)[number]

export type BreakpointId = 'desktop' | 'tablet' | 'mobile'

export type Breakpoint = {
  id: BreakpointId
  label: string
  prefix: string
  maxWidth: number
}

export const BREAKPOINTS: readonly Breakpoint[] = [
  { id: 'desktop', label: 'Desktop', prefix: '', maxWidth: Number.POSITIVE_INFINITY },
  { id: 'tablet', label: 'Tablet', prefix: 'max-lg', maxWidth: 1024 },
  { id: 'mobile', label: 'Mobile', prefix: 'max-sm', maxWidth: 640 },
]

export type StyleTarget = {
  breakpoint: BreakpointId
  state: StateVariant | null
}

export const BASE_TARGET: StyleTarget = { breakpoint: 'desktop', state: null }

const BREAKPOINT_BY_ID = new Map<BreakpointId, Breakpoint>(BREAKPOINTS.map((entry) => [entry.id, entry]))
const BREAKPOINT_BY_PREFIX = new Map<string, BreakpointId>()
for (const entry of BREAKPOINTS) if (entry.prefix) BREAKPOINT_BY_PREFIX.set(entry.prefix, entry.id)
const STATE_SET: ReadonlySet<string> = new Set(STATE_VARIANTS)

export function breakpointOf(id: BreakpointId): Breakpoint {
  return BREAKPOINT_BY_ID.get(id) ?? BREAKPOINTS[0]
}

export function breakpointForWidth(width: number): BreakpointId {
  if (width <= 0) return 'desktop'
  let match: BreakpointId = 'desktop'
  let tightest = Number.POSITIVE_INFINITY
  for (const entry of BREAKPOINTS) {
    if (width < entry.maxWidth && entry.maxWidth < tightest) {
      tightest = entry.maxWidth
      match = entry.id
    }
  }
  return match
}

function variantPrefixEnd(className: string): number {
  const bracket = className.indexOf('[')
  const head = bracket === -1 ? className : className.slice(0, bracket)
  return head.lastIndexOf(':')
}

export function stripVariants(className: string): string {
  const end = variantPrefixEnd(className)
  return end === -1 ? className : className.slice(end + 1)
}

export function targetOf(className: string): StyleTarget | null {
  const end = variantPrefixEnd(className)
  if (end === -1) return BASE_TARGET
  let breakpoint: BreakpointId = 'desktop'
  let state: StateVariant | null = null
  for (const part of className.slice(0, end).split(':')) {
    const asBreakpoint = BREAKPOINT_BY_PREFIX.get(part)
    if (asBreakpoint) {
      breakpoint = asBreakpoint
      continue
    }
    if (STATE_SET.has(part) && state === null) {
      state = part as StateVariant
      continue
    }
    return null
  }
  return { breakpoint, state }
}

export function sameTarget(a: StyleTarget, b: StyleTarget): boolean {
  return a.breakpoint === b.breakpoint && a.state === b.state
}

export function matchesTarget(className: string, target: StyleTarget): boolean {
  const parsed = targetOf(className)
  if (parsed === null) return sameTarget(target, BASE_TARGET)
  return sameTarget(parsed, target)
}

export function withTarget(className: string, target: StyleTarget): string {
  const prefix = breakpointOf(target.breakpoint).prefix
  const parts: string[] = []
  if (prefix) parts.push(prefix)
  if (target.state) parts.push(target.state)
  return parts.length === 0 ? className : `${parts.join(':')}:${className}`
}

export function targetLabel(target: StyleTarget): string {
  const breakpoint = breakpointOf(target.breakpoint).label
  return target.state ? `${breakpoint} · ${target.state}` : breakpoint
}

export function targetKey(target: StyleTarget): string {
  return `${target.breakpoint}:${target.state ?? ''}`
}

export function breakpointCascade(id: BreakpointId): BreakpointId[] {
  switch (id) {
    case 'mobile':
      return ['mobile', 'tablet', 'desktop']
    case 'tablet':
      return ['tablet', 'desktop']
    default:
      return ['desktop']
  }
}

export function cascadeOf(target: StyleTarget): StyleTarget[] {
  const breakpoints = breakpointCascade(target.breakpoint)
  const out: StyleTarget[] = breakpoints.map((breakpoint) => ({ breakpoint, state: target.state }))
  if (target.state) {
    for (const breakpoint of breakpoints) out.push({ breakpoint, state: null })
  }
  return out
}
