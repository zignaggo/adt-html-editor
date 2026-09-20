import type { NodeId } from '../../core/ids'
import { isStyled, type AnyNode } from '../../core/model'
import { useEditor, useNode } from '../Editor/context'

const COMMON_ATTRS: Record<string, string[]> = {
  a: ['id', 'href', 'target', 'rel', 'title'],
  img: ['id', 'src', 'alt', 'width', 'height', 'loading'],
  input: ['id', 'type', 'name', 'placeholder', 'value'],
  button: ['id', 'type', 'name', 'disabled'],
  default: ['id', 'title'],
}

export type AttributeField = { name: string; value: string }

export type AttributeFields =
  | { kind: 'none'; node: AnyNode | undefined }
  | { kind: 'text'; node: AnyNode; label: string; value: string; setValue: (value: string) => void }
  | {
      kind: 'attrs'
      node: AnyNode
      fields: AttributeField[]
      setAttribute: (name: string, value: string | null) => void
      addAttribute: (name: string, value: string) => boolean
    }

export function useAttributeFields(id: NodeId): AttributeFields {
  const node = useNode(id)
  const { setAttr, setText } = useEditor()

  if (!node) return { kind: 'none', node }

  if (node.kind === 'text' || node.kind === 'comment') {
    return {
      kind: 'text',
      node,
      label: node.kind === 'text' ? 'Text' : 'Comment',
      value: node.value,
      setValue: (value) => setText(id, value),
    }
  }

  if (!isStyled(node)) return { kind: 'none', node }

  const names = COMMON_ATTRS[node.tag] ?? COMMON_ATTRS.default
  const known = new Set(names)
  const fields: AttributeField[] = names.map((name) => ({ name, value: node.attrs[name] ?? '' }))
  for (const name of Object.keys(node.attrs)) {
    if (!known.has(name)) fields.push({ name, value: node.attrs[name] })
  }

  return {
    kind: 'attrs',
    node,
    fields,
    setAttribute: (name, value) => setAttr(id, name, value || null),
    addAttribute: (name, value) => {
      const trimmed = name.trim()
      if (!trimmed) return false
      setAttr(id, trimmed, value)
      return true
    },
  }
}
