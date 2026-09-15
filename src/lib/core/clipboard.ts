import type { NodeId } from './ids'
import type { EditorDocument } from './model'
import { serializeHtml } from './html/serialize'

let stored: string | null = null

export function copySubtrees(doc: EditorDocument, ids: readonly NodeId[]): string | null {
  const children = ids.filter((id) => doc.nodes[id] && id !== doc.rootId)
  if (children.length === 0) return null
  const isolated: EditorDocument = {
    rootId: 'clip-root',
    envelope: { kind: 'fragment' },
    nodes: {
      ...doc.nodes,
      'clip-root': {
        id: 'clip-root',
        kind: 'element',
        tag: '#root',
        attrs: {},
        attrOrder: [],
        classes: [],
        parentId: null,
        children,
      },
    },
  }
  stored = serializeHtml(isolated)
  return stored
}

export function copySubtree(doc: EditorDocument, id: NodeId): string | null {
  return copySubtrees(doc, [id])
}

export function readClipboard(): string | null {
  return stored
}

export function clearClipboard(): void {
  stored = null
}
