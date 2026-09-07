import { useEffect } from 'react'
import { resolveTarget, type DragTargetRef } from './resolveTarget'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import type { NodeId } from '../core/ids'
import { canHaveChildren, isDescendantOf, type AnyNode, type EditorDocument } from '../core/model'
import { useEditorStoreApi } from '../components/Editor/context'
import { canvasTarget, isEditorDrag, isNodeDrag } from './data'
import {
  attachCanvasZone,
  computeZone,
  layoutAxisOf,
  type LayoutAxis,
} from './canvasHitbox'
import { dragGeneration } from './dragStore'

export function acceptsNesting(doc: EditorDocument, node: AnyNode | undefined): boolean {
  if (!node || !canHaveChildren(node)) return false
  if (node.children.length === 0) return true
  return node.children.some((childId) => {
    const kind = doc.nodes[childId]?.kind
    return kind === 'element' || kind === 'opaque'
  })
}

export function useCanvasDropTarget(target: DragTargetRef, nodeId: NodeId) {
  const store = useEditorStoreApi()

  useEffect(() => {
    const element = resolveTarget(target)
    if (!element) return

    const isBlocked = (draggedId: NodeId | null) => {
      if (!draggedId) return false
      const { doc } = store.getState()
      return draggedId === nodeId || isDescendantOf(doc, nodeId, draggedId)
    }

    let cachedGeneration = -1
    let cachedOuterAxis: LayoutAxis = 'column'
    let cachedInnerAxis: LayoutAxis = 'column'

    const axes = (target: Element) => {
      const generation = dragGeneration()
      if (generation !== cachedGeneration) {
        cachedGeneration = generation
        const parent = target.parentElement
        cachedOuterAxis = parent ? layoutAxisOf(parent) : 'column'
        cachedInnerAxis = layoutAxisOf(target)
      }
      return { outer: cachedOuterAxis, inner: cachedInnerAxis }
    }

    return dropTargetForElements({
      element,
      canDrop: ({ source }) =>
        isEditorDrag(source.data) &&
        !isBlocked(isNodeDrag(source.data) ? source.data.nodeId : null),
      getIsSticky: () => true,
      getData: ({ input, element: target }) => {
        const { doc } = store.getState()
        const canNest = acceptsNesting(doc, doc.nodes[nodeId])
        const { outer, inner } = axes(target)
        const zone = computeZone({
          rect: target.getBoundingClientRect(),
          input,
          axis: outer,
          canNest,
        })
        return attachCanvasZone(
          canvasTarget({ nodeId, canNest, nestAxis: inner }),
          zone,
        )
      },
    })
  }, [target, nodeId, store])
}
