import { parseInlineStyle } from '../style/adapter'

export const INHERITED_PROPERTIES: readonly string[] = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'color',
  'text-align',
  'letter-spacing',
  'direction',
]

export function inheritedDeclarations(
  element: Element,
  container: Element,
  style: string | undefined,
): Map<string, string> {
  const out = new Map<string, string>()
  const declared = parseInlineStyle(style ?? '')
  const parent = element.parentElement ?? element
  if (parent === container) return out

  const view = element.ownerDocument.defaultView
  if (!view) return out
  const fromParent = view.getComputedStyle(parent)
  const fromContainer = view.getComputedStyle(container)
  const own = view.getComputedStyle(element)

  for (const property of INHERITED_PROPERTIES) {
    if (declared.has(property)) continue
    const before = fromParent.getPropertyValue(property)
    const after = fromContainer.getPropertyValue(property)
    if (before === after) continue
    const value = own.getPropertyValue(property)
    if (value) out.set(property, value)
  }
  return out
}
