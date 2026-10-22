export type Translation = {
  x: number
  y: number
}

export const NO_TRANSLATION: Translation = { x: 0, y: 0 }

const PROBE_STYLE =
  'position:absolute;top:0;left:0;height:0;visibility:hidden;pointer-events:none;contain:strict'

function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** Splits `translate` into its components without breaking a `calc()` apart. */
export function splitComponents(value: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''

  for (const char of value) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (char === ' ' && depth === 0) {
      if (current) out.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current) out.push(current)
  return out
}

export function parsePx(value: string): number | null {
  const match = value.trim().match(/^(-?[\d.]+)px$/)
  if (match) return Number.parseFloat(match[1])
  if (value.trim() === '0') return 0
  return null
}

/**
 * Resolves one length against a basis, as the browser would. A margin is used rather than a
 * width because it is the one box property that accepts a negative value, and its percentage
 * resolves against the containing block the probe declares.
 */
function resolveLength(
  value: string,
  basis: number,
  fontSize: string,
  host: HTMLElement,
): number | null {
  const direct = parsePx(value)
  if (direct !== null) return direct

  const doc = host.ownerDocument
  const outer = doc.createElement('div')
  outer.style.cssText = `${PROBE_STYLE};width:${basis}px;font-size:${fontSize}`
  const inner = doc.createElement('div')
  inner.style.marginLeft = value
  outer.appendChild(inner)
  host.appendChild(outer)

  const resolved = Number.parseFloat(doc.defaultView?.getComputedStyle(inner).marginLeft ?? '')
  outer.remove()

  return Number.isFinite(resolved) ? resolved : null
}

/**
 * A `translate` value in px, resolved against `element`. Percentages resolve against its own
 * border box, font-relative units against its own font size, and `calc()` through the probe.
 */
export function resolveTranslation(
  value: string | undefined,
  element: HTMLElement,
  probeHost?: HTMLElement,
): Translation {
  if (!value || value === 'none') return NO_TRANSLATION

  const view = element.ownerDocument.defaultView
  if (!view) return NO_TRANSLATION

  const parts = splitComponents(value)
  if (parts.length === 0) return NO_TRANSLATION

  // The probe goes to the body, never into the canvas: a node appended there would wake the
  // editor's own MutationObservers and schedule a measure for every value it resolves.
  const host = probeHost ?? element.ownerDocument.body
  const { fontSize } = view.getComputedStyle(element)
  const x = resolveLength(parts[0], element.offsetWidth, fontSize, host)
  const y = parts[1] ? resolveLength(parts[1], element.offsetHeight, fontSize, host) : 0

  return { x: x ?? 0, y: y ?? 0 }
}

/**
 * What the element is actually translated by right now. Reads the DOM, so a caller rendering
 * from the model should resolve the declared value instead — the attribute reaches the DOM
 * one effect later, and this would still be showing the previous position.
 */
export function readTranslation(element: HTMLElement, probeHost?: HTMLElement): Translation {
  const view = element.ownerDocument.defaultView
  if (!view) return NO_TRANSLATION
  return resolveTranslation(view.getComputedStyle(element).translate, element, probeHost)
}

/** Adds px to one component, folding into a `calc()` it already carries instead of nesting. */
export function addToComponent(value: string, delta: number): string {
  const direct = parsePx(value)
  if (direct !== null) return `${round(direct + delta)}px`
  if (delta === 0) return value

  const folded = value.trim().match(/^calc\((.+?)\s*([+-])\s*([\d.]+)px\s*\)$/)
  if (folded) {
    const signed = Number.parseFloat(folded[3]) * (folded[2] === '-' ? -1 : 1) + delta
    const rounded = round(signed)
    if (rounded === 0) return `calc(${folded[1]})`
    return `calc(${folded[1]} ${rounded < 0 ? '-' : '+'} ${Math.abs(rounded)}px)`
  }

  const rounded = round(delta)
  return `calc(${value} ${rounded < 0 ? '-' : '+'} ${Math.abs(rounded)}px)`
}

export function formatTranslation(x: string, y: string): string {
  const horizontal = x.trim() || '0px'
  const vertical = y.trim() || '0px'
  if (parsePx(vertical) === 0) return horizontal
  return `${horizontal} ${vertical}`
}

export function isNoTranslation(value: string): boolean {
  if (!value || value.trim() === 'none') return true
  return splitComponents(value).every((part) => parsePx(part) === 0)
}

/** Offsets whatever the element declares, keeping its own expressions intact. */
export function offsetTranslation(declared: string | undefined, dx: number, dy: number): string {
  const parts = declared && declared !== 'none' ? splitComponents(declared) : []
  const next = formatTranslation(
    addToComponent(parts[0] ?? '0px', dx),
    addToComponent(parts[1] ?? '0px', dy),
  )
  return isNoTranslation(next) ? 'none' : next
}

const TOLERANCE = 0.75

/**
 * Whether the element really ended up where it was told to go. A class carrying `!important`,
 * or an animation, wins over the inline value and the control has to say so.
 */
export function translationMatches(element: HTMLElement, expected: Translation): boolean {
  const actual = readTranslation(element)
  return (
    Math.abs(actual.x - expected.x) <= TOLERANCE && Math.abs(actual.y - expected.y) <= TOLERANCE
  )
}

/**
 * The scale applied between `root` and the element. Null when an ancestor rotates, skews or
 * uses 3D, because the pointer delta then no longer maps to an offset on these two axes.
 */
export function ancestorScale(element: HTMLElement, root: HTMLElement): number | null {
  const view = element.ownerDocument.defaultView
  if (!view) return null

  let scale = 1
  let current: HTMLElement | null = element.parentElement

  while (current && root.contains(current)) {
    const { transform } = view.getComputedStyle(current)
    if (transform && transform !== 'none') {
      if (!transform.startsWith('matrix(')) return null
      const parts = transform.slice(7, -1).split(',').map(Number)
      if (parts.length !== 6 || parts.some((entry) => !Number.isFinite(entry))) return null
      const [a, b, c, d] = parts
      if (Math.abs(b) > 1e-6 || Math.abs(c) > 1e-6) return null
      if (Math.abs(a - d) > 1e-6) return null
      scale *= a
    }
    if (current === root) break
    current = current.parentElement
  }

  return scale === 0 ? null : scale
}
