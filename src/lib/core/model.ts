import type { NodeId } from './ids'

export const ROOT_TAG = '#root'

export type ElementNode = {
  id: NodeId
  kind: 'element'
  tag: string
  attrs: Record<string, string>
  attrOrder: string[]
  classes: string[]
  parentId: NodeId | null
  children: NodeId[]
}

export type TextNode = {
  id: NodeId
  kind: 'text'
  value: string
  parentId: NodeId
}

export type CommentNode = {
  id: NodeId
  kind: 'comment'
  value: string
  parentId: NodeId
}

export type OpaqueNode = {
  id: NodeId
  kind: 'opaque'
  tag: string
  attrs: Record<string, string>
  attrOrder: string[]
  classes: string[]
  rawInnerHtml: string
  parentId: NodeId
}

export type AnyNode = ElementNode | TextNode | CommentNode | OpaqueNode
export type StyledNode = ElementNode | OpaqueNode

export type Envelope =
  | { kind: 'fragment' }
  | { kind: 'document'; doctype: string; htmlAttrs: string; head: string; bodyAttrs: string }

export type EditorDocument = {
  rootId: NodeId
  nodes: Record<NodeId, AnyNode>
  envelope: Envelope
}

export const VOID_TAGS: ReadonlySet<string> = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
])

export const OPAQUE_TAGS: ReadonlySet<string> = new Set([
  'script', 'style', 'svg', 'math', 'iframe', 'template', 'noscript',
])

export const PRESERVE_WHITESPACE_TAGS: ReadonlySet<string> = new Set(['pre', 'textarea', 'listing', 'plaintext'])

export const INLINE_TAGS: ReadonlySet<string> = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'button', 'cite', 'code', 'data', 'del',
  'dfn', 'em', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'mark', 'output',
  'picture', 'q', 's', 'samp', 'select', 'small', 'span', 'strong', 'sub',
  'sup', 'svg', 'textarea', 'time', 'u', 'var', 'video', 'audio', 'wbr',
])

export function isStyled(node: AnyNode): node is StyledNode {
  return node.kind === 'element' || node.kind === 'opaque'
}

export function canHaveChildren(node: AnyNode): node is ElementNode {
  return node.kind === 'element' && !VOID_TAGS.has(node.tag)
}

export function isRoot(node: AnyNode): boolean {
  return node.kind === 'element' && node.tag === ROOT_TAG
}

export function childrenOf(doc: EditorDocument, id: NodeId): NodeId[] {
  const node = doc.nodes[id]
  return node && node.kind === 'element' ? node.children : EMPTY_CHILDREN
}

const EMPTY_CHILDREN: NodeId[] = []

export function ancestorIdsOf(doc: EditorDocument, id: NodeId): NodeId[] {
  const out: NodeId[] = []
  let current = doc.nodes[id]?.parentId ?? null
  while (current) {
    out.push(current)
    current = doc.nodes[current]?.parentId ?? null
  }
  return out
}

export function isDescendantOf(doc: EditorDocument, candidate: NodeId, ancestor: NodeId): boolean {
  let current: NodeId | null = candidate
  while (current) {
    if (current === ancestor) return true
    current = doc.nodes[current]?.parentId ?? null
  }
  return false
}

export function depthOf(doc: EditorDocument, id: NodeId): number {
  let depth = 0
  let current = doc.nodes[id]?.parentId ?? null
  while (current) {
    depth += 1
    current = doc.nodes[current]?.parentId ?? null
  }
  return depth
}

export function collectSubtree(doc: EditorDocument, id: NodeId, out: NodeId[] = []): NodeId[] {
  out.push(id)
  const node = doc.nodes[id]
  if (node && node.kind === 'element') {
    for (const child of node.children) collectSubtree(doc, child, out)
  }
  return out
}

export function withClasses<T extends StyledNode>(node: T, classes: string[]): T {
  const hasClassSlot = node.attrOrder.includes('class')
  if (classes.length === 0) {
    return { ...node, classes, attrOrder: node.attrOrder.filter((name) => name !== 'class') }
  }
  return {
    ...node,
    classes,
    attrOrder: hasClassSlot ? node.attrOrder : [...node.attrOrder, 'class'],
  }
}

export function withAttr<T extends ElementNode | OpaqueNode>(
  node: T,
  name: string,
  value: string | null,
): T {
  if (name === 'class') {
    return withClasses(node, value ? value.trim().split(/\s+/).filter(Boolean) : [])
  }
  if (value === null) {
    const attrs = { ...node.attrs }
    delete attrs[name]
    return { ...node, attrs, attrOrder: node.attrOrder.filter((entry) => entry !== name) }
  }
  const alreadyThere = name in node.attrs
  return {
    ...node,
    attrs: { ...node.attrs, [name]: value },
    attrOrder: alreadyThere ? node.attrOrder : [...node.attrOrder, name],
  }
}

export function labelOf(node: AnyNode): string {
  switch (node.kind) {
    case 'element':
      return isRoot(node) ? 'documento' : node.tag
    case 'opaque':
      return node.tag
    case 'comment':
      return 'comentário'
    case 'text':
      return node.value.trim() || 'texto'
  }
}

export function classSetOf(doc: EditorDocument): Set<string> {
  const out = new Set<string>()
  for (const id in doc.nodes) {
    const node = doc.nodes[id]
    if (isStyled(node)) for (const cls of node.classes) out.add(cls)
  }
  return out
}
