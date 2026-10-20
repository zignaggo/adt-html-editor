import type { NodeId } from '../core/ids'
import type { EditorActions } from '../core/store'
import { formatInlineStyle, parseInlineStyle } from './adapter'

export type StyleCommit = {
  classes?: readonly string[]
  style?: string | null
}

export function withInlineProps(
  style: string | null | undefined,
  properties: Readonly<Record<string, string>>,
): string {
  const declarations = parseInlineStyle(style ?? '')
  for (const [name, value] of Object.entries(properties)) declarations.set(name, value)
  return formatInlineStyle(declarations)
}

export function clearInlineProps(
  style: string | undefined,
  properties: readonly string[],
): string | null {
  if (!style) return null
  const declarations = parseInlineStyle(style)
  let changed = false
  for (const property of properties) {
    if (declarations.delete(property)) changed = true
  }
  if (!changed) return style
  return formatInlineStyle(declarations) || null
}

/**
 * One history entry for a write that touches classes and the inline style at once —
 * the two actions coalesce under different keys on their own.
 */
export function commitStyle(
  actions: EditorActions,
  id: NodeId,
  next: StyleCommit,
  coalesceKey: string,
): void {
  actions.transaction(() => {
    if (next.classes) actions.setClasses(id, [...next.classes])
    if (next.style !== undefined) actions.setAttr(id, 'style', next.style)
  }, { coalesceKey })
}
