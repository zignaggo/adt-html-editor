import { useEffect, useState } from 'react'
import { resolveTarget, type DragTargetRef } from './resolveTarget'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import type { NodeId } from '../core/ids'
import { labelOf } from '../core/model'
import { useEditorStoreApi } from '../components/Editor/context'
import { nodeDrag, type DragSurface } from './data'
import { renderDragPreview } from './preview'

export function useNodeDraggable(
  target: DragTargetRef,
  nodeId: NodeId,
  surface: DragSurface,
  enabled: boolean,
) {
  const store = useEditorStoreApi()
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const element = resolveTarget(target)
    if (!element) return

    return draggable({
      element,
      getInitialData: () => {
        const node = store.state.doc.nodes[nodeId]
        return nodeDrag({ nodeId, surface, label: node ? labelOf(node) : nodeId })
      },
      onGenerateDragPreview({ nativeSetDragImage }) {
        const node = store.state.doc.nodes[nodeId]
        const classes = node && 'classes' in node ? node.classes : []
        renderDragPreview(nativeSetDragImage, {
          label: node ? labelOf(node) : nodeId,
          detail: classes.length > 0 ? classes.slice(0, 3).join(' ') : undefined,
        })
      },
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })
  }, [target, nodeId, surface, enabled, store])

  return isDragging
}
