import type { NodeId } from './ids'
import type { EditorDocument } from './model'
import { serializeHtml } from './html/serialize'

let stored: string | null = null

export function copySubtree(doc: EditorDocument, id: NodeId): string | null {
  const node = doc.nodes[id]
  if (!node || id === doc.rootId) return null
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
        children: [id],
      },
    },
  }
  stored = serializeHtml(isolated)
  return stored
}

export function readClipboard(): string | null {
  return stored
}

export function clearClipboard(): void {
  stored = null
}
