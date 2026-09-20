export function parsePx(value: string | undefined): number | null {
  if (!value) return null
  const match = value.match(/^(-?[\d.]+)px$/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null
}

const WEIGHT_NAMES: ReadonlyArray<readonly [number, string]> = [
  [100, 'thin'],
  [200, 'extralight'],
  [300, 'light'],
  [400, 'normal'],
  [500, 'medium'],
  [600, 'semibold'],
  [700, 'bold'],
  [800, 'extrabold'],
  [900, 'black'],
]

export function weightName(value: string | undefined): string | null {
  if (!value) return null
  if (value === 'normal') return 'normal'
  if (value === 'bold') return 'bold'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  let best: string | null = null
  let distance = Number.POSITIVE_INFINITY
  for (const [weight, name] of WEIGHT_NAMES) {
    const delta = Math.abs(weight - numeric)
    if (delta < distance) {
      distance = delta
      best = name
    }
  }
  return best
}

export function alignName(value: string | undefined): string | null {
  if (!value) return null
  if (value === 'start') return 'left'
  if (value === 'end') return 'right'
  if (value === 'left' || value === 'center' || value === 'right' || value === 'justify') return value
  return null
}

export function lineHeightRatio(lineHeight: string | undefined, fontSize: string | undefined): number | null {
  if (!lineHeight || lineHeight === 'normal') return null
  const line = parsePx(lineHeight)
  const size = parsePx(fontSize)
  if (line === null || size === null || size === 0) return null
  return Math.round((line / size) * 1000) / 1000
}

export function rgbToHex(value: string | undefined): string | null {
  if (!value) return null
  const match = value.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/)
  if (!match) return null
  const alpha = match[4]
  if (alpha !== undefined) {
    const parsed = alpha.endsWith('%') ? Number(alpha.slice(0, -1)) / 100 : Number(alpha)
    if (parsed === 0) return 'transparent'
  }
  const channel = (raw: string) => Number(raw).toString(16).padStart(2, '0')
  return `#${channel(match[1])}${channel(match[2])}${channel(match[3])}`
}
