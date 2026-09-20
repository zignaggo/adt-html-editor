import { makeColorClassMap } from './color'
import { lastMatch, type ClassMap } from './types'

export const backgroundColorClassMap = makeColorClassMap('bg')

const OPACITY_PATTERN = /^opacity-(\d+|\[[\d.]+\])$/

export const opacityClassMap: ClassMap<number> = {
  matches: (className) => OPACITY_PATTERN.test(className),
  fromClasses: (classes) =>
    lastMatch(classes, (className) => {
      const match = className.match(OPACITY_PATTERN)
      if (!match) return null
      const suffix = match[1]
      if (suffix.startsWith('[')) {
        const fraction = Number(suffix.slice(1, -1))
        if (!Number.isFinite(fraction)) return null
        return fraction <= 1 ? fraction * 100 : fraction
      }
      const percent = Number(suffix)
      return Number.isFinite(percent) ? percent : null
    }),
  toClasses(value) {
    if (!Number.isFinite(value) || value >= 100) return []
    if (Number.isInteger(value) && value % 5 === 0) return [`opacity-${value}`]
    return [`opacity-[${value / 100}]`]
  },
}

export const SHADOW_VALUES = ['none', 'xs', 'sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl', 'inner'] as const
const SHADOW_PATTERN = /^shadow(?:-(none|xs|sm|md|lg|xl|2xl|inner))?$/

export const shadowClassMap: ClassMap<string> = {
  matches: (className) => SHADOW_PATTERN.test(className),
  fromClasses: (classes) =>
    lastMatch(classes, (className) => {
      const match = className.match(SHADOW_PATTERN)
      if (!match) return null
      return match[1] ?? 'DEFAULT'
    }),
  toClasses(value) {
    if (!value || value === 'none') return []
    if (value === 'DEFAULT') return ['shadow']
    return SHADOW_VALUES.includes(value as (typeof SHADOW_VALUES)[number]) ? [`shadow-${value}`] : []
  },
}
