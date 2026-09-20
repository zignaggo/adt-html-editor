import { hexFromToken } from '../../../../lib/tailwind/palette'

const HEX6 = /^#[0-9a-f]{6}$/i

export function isHex6(value: string): boolean {
  return HEX6.test(value)
}

export function expandHex(short: string): string {
  const [r, g, b] = short.slice(1)
  return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
}

export function resolveHex(value: string): string | null {
  if (!value) return null
  if (value === 'transparent') return 'transparent'
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) return value.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(value)) return expandHex(value)
  return hexFromToken(value)
}

export function normalizeHex(raw: string): string | null {
  const trimmed = raw.trim()
  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  if (/^#[0-9a-f]{3}$/i.test(prefixed)) return expandHex(prefixed)
  return HEX6.test(prefixed) ? prefixed.toLowerCase() : null
}

export function isLight(hex: string): boolean {
  const match = hex.match(/^#([0-9a-f]{6})/i)
  if (!match) return true
  const n = Number.parseInt(match[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 160
}
