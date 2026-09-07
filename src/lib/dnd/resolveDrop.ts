import type { DropTargetRecord, Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { extractInstruction, type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item'
import type { NodeId } from '../core/ids'
import { canHaveChildren, isDescendantOf, type EditorDocument } from '../core/model'
import type { DropPosition } from '../core/store'
import { isCanvasTarget, isSurfaceTarget, isTreeTarget } from './data'
import { computeInsideSpot, extractCanvasZone } from './canvasHitbox'

function indexIn(doc: EditorDocument, id: NodeId): { parentId: NodeId; index: number } | null {
  const node = doc.nodes[id]
  if (!node?.parentId) return null
  const parent = doc.nodes[node.parentId]
  if (!parent || parent.kind !== 'element') return null
  const index = parent.children.indexOf(id)
  if (index === -1) return null
  return { parentId: node.parentId, index }
}

function ancestorAtLevelsUp(doc: EditorDocument, id: NodeId, steps: number): NodeId {
  let current = id
  for (let i = 0; i < steps; i += 1) {
    const parentId = doc.nodes[current]?.parentId
    if (!parentId) return current
    current = parentId
  }
  return current
}

function fromInstruction(
  doc: EditorDocument,
  targetId: NodeId,
  instruction: Instruction,
): DropPosition | null {
  if (instruction.type === 'instruction-blocked') return null

  if (instruction.type === 'make-child') {
    const target = doc.nodes[targetId]
    if (!target || !canHaveChildren(target)) return null
    return { parentId: targetId, index: 0 }
  }

  if (instruction.type === 'reparent') {
    const steps = Math.max(0, instruction.currentLevel - instruction.desiredLevel)
    const ancestor = ancestorAtLevelsUp(doc, targetId, steps)
    const spot = indexIn(doc, ancestor)
    return spot ? { parentId: spot.parentId, index: spot.index + 1 } : null
  }

  const spot = indexIn(doc, targetId)
  if (!spot) return null
  return {
    parentId: spot.parentId,
    index: instruction.type === 'reorder-above' ? spot.index : spot.index + 1,
  }
}

function fromCanvasTarget(
  doc: EditorDocument,
  target: DropTargetRecord,
  input: Input | undefined,
): DropPosition | null {
  if (!isCanvasTarget(target.data)) return null
  const zone = extractCanvasZone(target.data)
  if (!zone) return null

  const { nodeId, nestAxis } = target.data

  if (zone.type === 'edge') {
    const spot = indexIn(doc, nodeId)
    if (!spot) return null
    const before = zone.edge === 'top' || zone.edge === 'left'
    return { parentId: spot.parentId, index: before ? spot.index : spot.index + 1 }
  }

  const container = doc.nodes[nodeId]
  if (!container || container.kind !== 'element') return null

  if (!input) return { parentId: nodeId, index: container.children.length }

  const spot = computeInsideSpot(target.element, input, nestAxis)
  if (!spot.beforeId) return { parentId: nodeId, index: container.children.length }

  const index = container.children.indexOf(spot.beforeId)
  return { parentId: nodeId, index: index === -1 ? container.children.length : index }
}

export function resolveDrop(
  doc: EditorDocument,
  target: DropTargetRecord | undefined,
  draggedId: NodeId | null,
  input?: Input,
): DropPosition | null {
  if (!target) return null
  const { data } = target

  let position: DropPosition | null = null

  if (isTreeTarget(data)) {
    const instruction = extractInstruction(data)
    position = instruction ? fromInstruction(doc, data.nodeId, instruction) : null
  } else if (isCanvasTarget(data)) {
    position = fromCanvasTarget(doc, target, input)
  } else if (isSurfaceTarget(data)) {
    const root = doc.nodes[doc.rootId]
    position =
      root && root.kind === 'element'
        ? { parentId: doc.rootId, index: root.children.length }
        : null
  }

  if (!position) return null
  const parent = doc.nodes[position.parentId]
  if (!parent || !canHaveChildren(parent)) return null
  if (draggedId && isDescendantOf(doc, position.parentId, draggedId)) return null
  return position
}

export function canDropOnNode(
  doc: EditorDocument,
  targetId: NodeId,
  draggedId: NodeId | null,
): boolean {
  if (!draggedId) return true
  if (targetId === draggedId) return true
  return !isDescendantOf(doc, targetId, draggedId)
}
