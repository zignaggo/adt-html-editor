import type { DropTargetRecord, Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import type { NodeId } from '../core/ids'
import type { EditorDocument } from '../core/model'
import { attachCanvasZone, computeZone, type CanvasZone } from './canvasHitbox'
import { isCanvasTarget } from './data'

export function pickDropTarget(
  doc: EditorDocument,
  dropTargets: DropTargetRecord[],
  draggedId: NodeId | null,
  input: Input,
): DropTargetRecord | undefined {
  const innermost = dropTargets[0]
  if (!innermost || !draggedId || !isCanvasTarget(innermost.data)) return innermost

  const parentId = doc.nodes[draggedId]?.parentId
  if (!parentId) return innermost

  const parentIndex = dropTargets.findIndex(
    (record) => isCanvasTarget(record.data) && record.data.nodeId === parentId,
  )
  if (parentIndex === -1) return innermost

  const parent = dropTargets[parentIndex]
  if (!isCanvasTarget(parent.data)) return innermost

  if (parentIndex === 0) return withZone(parent, { type: 'inside' })

  const sibling = dropTargets[parentIndex - 1]
  if (!isCanvasTarget(sibling.data)) return innermost

  const zone = computeZone({
    rect: sibling.element.getBoundingClientRect(),
    input,
    axis: parent.data.nestAxis,
    canNest: true,
    band: 'wide',
  })
  return zone.type === 'edge' ? withZone(sibling, zone) : innermost
}

function withZone(record: DropTargetRecord, zone: CanvasZone): DropTargetRecord {
  return { ...record, data: attachCanvasZone(record.data, zone) }
}
