import { pxToSpacingToken, spacingTokenToPx } from './spacingScale'
import { keywordClassMap, lastMatch, type ClassMap } from './types'

export const DISPLAY_VALUES = [
  'block',
  'inline-block',
  'inline',
  'flex',
  'inline-flex',
  'grid',
  'inline-grid',
  'hidden',
  'flow-root',
  'contents',
  'table',
  'table-row',
  'table-cell',
] as const

const DISPLAY_SET: ReadonlySet<string> = new Set(DISPLAY_VALUES)

export const displayClassMap: ClassMap<string> = {
  matches: (className) => DISPLAY_SET.has(className),
  fromClasses: (classes) => lastMatch(classes, (className) => (DISPLAY_SET.has(className) ? className : null)),
  toClasses: (value) => (DISPLAY_SET.has(value) ? [value] : []),
}

export const FLEX_DIRECTION_VALUES = ['row', 'row-reverse', 'col', 'col-reverse'] as const
export const flexDirectionClassMap: ClassMap<string> = keywordClassMap('flex', FLEX_DIRECTION_VALUES)

export const JUSTIFY_VALUES = ['start', 'center', 'end', 'between', 'around', 'evenly'] as const
export const justifyContentClassMap: ClassMap<string> = keywordClassMap('justify', JUSTIFY_VALUES)

export const ALIGN_ITEMS_VALUES = ['start', 'center', 'end', 'baseline', 'stretch'] as const
export const alignItemsClassMap: ClassMap<string> = keywordClassMap('items', ALIGN_ITEMS_VALUES)

const GAP_PATTERN = /^gap(?:-x|-y)?-(.+)$/

export const gapClassMap: ClassMap<number> = {
  matches: (className) => GAP_PATTERN.test(className),
  fromClasses: (classes) =>
    lastMatch(classes, (className) => {
      const match = className.match(GAP_PATTERN)
      return match ? spacingTokenToPx(match[1]) : null
    }),
  toClasses(value) {
    if (!Number.isFinite(value) || value < 0) return []
    return [`gap-${pxToSpacingToken(value)}`]
  },
}
