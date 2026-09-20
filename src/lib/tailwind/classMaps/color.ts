import { lastMatch, type ClassMap } from './types'

const COLOR_KEYWORDS = 'white|black|transparent|current|inherit'
const HEX = /^#[0-9a-fA-F]{3,8}$/

export function makeColorClassMap(prefix: string): ClassMap<string> {
  const pattern = new RegExp(`^${prefix}-(${COLOR_KEYWORDS}|[a-z]+-\\d+|\\[#[0-9a-fA-F]{3,8}\\])$`)
  const read = (className: string): string | null => {
    const match = className.match(pattern)
    if (!match) return null
    const captured = match[1]
    return captured.startsWith('[') ? captured.slice(1, -1) : captured
  }
  return {
    matches: (className) => pattern.test(className),
    fromClasses: (classes) => lastMatch(classes, read),
    toClasses(value) {
      if (!value) return []
      if (HEX.test(value)) return [`${prefix}-[${value}]`]
      return [`${prefix}-${value}`]
    },
  }
}
