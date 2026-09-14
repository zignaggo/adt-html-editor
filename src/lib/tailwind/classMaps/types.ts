export type ClassMap<TValue> = {
  matches: (className: string) => boolean
  fromClasses: (classes: readonly string[]) => TValue | null
  toClasses: (value: TValue) => string[]
}

export type BoxValue = {
  t: number
  r: number
  b: number
  l: number
}

export type UnitValue = {
  value: string
  unit: string
}

export function lastMatch<TValue>(
  classes: readonly string[],
  read: (className: string) => TValue | null,
): TValue | null {
  let last: TValue | null = null
  for (const className of classes) {
    const parsed = read(className)
    if (parsed !== null) last = parsed
  }
  return last
}

export function keywordClassMap(prefix: string, values: readonly string[]): ClassMap<string> {
  const allowed = new Set(values)
  const read = (className: string): string | null => {
    if (!className.startsWith(`${prefix}-`)) return null
    const suffix = className.slice(prefix.length + 1)
    return allowed.has(suffix) ? suffix : null
  }
  return {
    matches: (className) => read(className) !== null,
    fromClasses: (classes) => lastMatch(classes, read),
    toClasses: (value) => (allowed.has(value) ? [`${prefix}-${value}`] : []),
  }
}

export function parseArbitraryLength(
  suffix: string,
  units: readonly string[],
): { value: number; unit: string } | null {
  const match = suffix.match(/^\[([\d.]+)([a-z%]*)\]$/)
  if (!match) return null
  const value = Number(match[1])
  if (!Number.isFinite(value)) return null
  const unit = match[2] || 'px'
  return units.includes(unit) ? { value, unit } : null
}
