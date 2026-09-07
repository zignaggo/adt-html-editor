import { useEffect } from 'react'
import { resolveTarget, type DragTargetRef } from './resolveTarget'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import {
  attachInstruction,
  type Instruction,
  type ItemMode,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item'
import type { NodeId } from '../core/ids'
import { canHaveChildren, isDescendantOf } from '../core/model'
import { useEditorStoreApi } from '../components/Editor/context'
import { isEditorDrag, isNodeDrag, treeTarget } from './data'
import type { IndicatorShape } from './dragStore'

export const INDENT_PER_LEVEL = 16

const ALL_INSTRUCTIONS: Instruction['type'][] = [
  'reorder-above',
  'reorder-below',
  'make-child',
  'reparent',
]

export function shapeForInstruction(
  rect: DOMRect,
  instruction: Instruction | null,
): IndicatorShape {
  if (!instruction || instruction.type === 'instruction-blocked') return { kind: 'none' }

  if (instruction.type === 'make-child') {
    return { kind: 'box', top: rect.top, left: rect.left, width: rect.width, height: rect.height }
  }

  const level =
    instruction.type === 'reparent' ? instruction.desiredLevel : instruction.currentLevel
  const indent = (level + 1) * instruction.indentPerLevel

  return {
    kind: 'line',
    axis: 'horizontal',
    top: instruction.type === 'reorder-above' ? rect.top : rect.bottom,
    left: rect.left + indent,
    length: Math.max(0, rect.width - indent),
    indent,
  }
}

export function useTreeDropTarget(
  target: DragTargetRef,
  nodeId: NodeId,
  level: number,
  mode: ItemMode,
) {
  const store = useEditorStoreApi()

  useEffect(() => {
    const element = resolveTarget(target)
    if (!element) return

    const blockedFor = (draggedId: NodeId | null): Instruction['type'][] => {
      const { doc } = store.getState()
      if (draggedId && (draggedId === nodeId || isDescendantOf(doc, nodeId, draggedId))) {
        return ALL_INSTRUCTIONS
      }
      const node = doc.nodes[nodeId]
      return node && canHaveChildren(node) ? [] : ['make-child']
    }

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => isEditorDrag(source.data),
      getIsSticky: () => true,
      getData: ({ input, element: rowElement, source }) =>
        attachInstruction(treeTarget({ nodeId, level }), {
          element: rowElement,
          input,
          currentLevel: level,
          indentPerLevel: INDENT_PER_LEVEL,
          mode,
          block: blockedFor(isNodeDrag(source.data) ? source.data.nodeId : null),
        }),
    })
  }, [target, nodeId, level, mode, store])
}
