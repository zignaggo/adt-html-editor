import type { NodeId } from '../core/ids'
import type { StyledNode } from '../core/model'
import type { StyleTarget } from '../tailwind/variants'

export type StyleWrite =
  | { kind: 'classes'; id: NodeId; classes: string[] }
  | { kind: 'attr'; id: NodeId; name: string; value: string | null }

export type StyleAdapter = {
  id: 'tailwind' | 'inline-css'
  label: string
  supportsVariants: boolean
  read: (node: StyledNode, property: string, target: StyleTarget) => string | null
  write: (node: StyledNode, property: string, value: string | null, target: StyleTarget) => StyleWrite
}

export function parseInlineStyle(style: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const part of style.split(';')) {
    const separator = part.indexOf(':')
    if (separator === -1) continue
    const name = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    if (name && value) out.set(name, value)
  }
  return out
}

export function formatInlineStyle(declarations: Map<string, string>): string {
  return [...declarations].map(([name, value]) => `${name}: ${value}`).join('; ')
}

export const inlineCssAdapter: StyleAdapter = {
  id: 'inline-css',
  label: 'Plain CSS',
  supportsVariants: false,

  read(node, property) {
    return parseInlineStyle(node.attrs.style ?? '').get(property) ?? null
  },

  write(node, property, value) {
    const declarations = parseInlineStyle(node.attrs.style ?? '')
    if (value === null) declarations.delete(property)
    else declarations.set(property, value)
    const style = formatInlineStyle(declarations)
    return { kind: 'attr', id: node.id, name: 'style', value: style || null }
  },
}
