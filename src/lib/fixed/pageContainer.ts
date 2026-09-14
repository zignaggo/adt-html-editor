import type { NodeId } from '../core/ids'
import type { EditorDocument } from '../core/model'

export function pageContainerOf(doc: EditorDocument): NodeId {
  const root = doc.nodes[doc.rootId]
  if (!root || root.kind !== 'element') return doc.rootId
  const elements = root.children.filter((id) => doc.nodes[id]?.kind === 'element')
  return elements.length === 1 ? elements[0] : doc.rootId
}
