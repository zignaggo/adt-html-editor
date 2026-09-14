import { useEffect, useState } from 'react'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import type { NodeId } from '../core/ids'
import { labelOf } from '../core/model'
import { useEditorStoreApi } from '../components/Editor/context'
import { isFixedPageTarget, nodeDrag } from '../dnd/data'
import { resolveTarget, type DragTargetRef } from '../dnd/resolveTarget'
import { beginFixedDrag, finishFixedDrag, moveFixedDrag, scaleOf } from './fixedDrag'
import { useFixedDragEnv } from './useFixedDragEnv'

export function useFixedDraggable(target: DragTargetRef, nodeId: NodeId, enabled: boolean): boolean {
  const store = useEditorStoreApi()
  const getEnv = useFixedDragEnv()
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const element = resolveTarget(target)
    if (!element) return

    return draggable({
      element,
      getInitialData: () => {
        const node = store.state.doc.nodes[nodeId]
        return nodeDrag({ nodeId, surface: 'canvas', label: node ? labelOf(node) : nodeId })
      },
      onGenerateDragPreview({ nativeSetDragImage, location }) {
        const env = getEnv()
        env.ghost.generatePreview({
          nativeSetDragImage,
          element,
          input: location.current.input,
          scale: scaleOf(env),
        })
      },
      onDragStart({ location }) {
        setIsDragging(true)
        beginFixedDrag(getEnv(), {
          nodeId,
          template: null,
          element,
          input: location.current.input,
        })
      },
      onDrag({ location }) {
        moveFixedDrag(getEnv(), location.current.input)
      },
      onDrop({ location }) {
        setIsDragging(false)
        const over = location.current.dropTargets[0]
        finishFixedDrag(getEnv(), Boolean(over && isFixedPageTarget(over.data)))
      },
    })
  }, [target, nodeId, enabled, store, getEnv])

  return isDragging
}
