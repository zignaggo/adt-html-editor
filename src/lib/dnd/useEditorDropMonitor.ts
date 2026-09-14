import { useEffect } from 'react'
import {
  monitorForElements,
  type ElementDragPayload,
} from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import type { DragLocationHistory, DropTargetRecord } from '@atlaskit/pragmatic-drag-and-drop/types'
import { labelOf } from '../core/model'
import { useEditorStoreApi } from '../components/Editor/context'
import { isEditorDrag, isNodeDrag, isPaletteDrag } from './data'
import { beginDragGeneration, clearIndicators, setIndicator } from './dragStore'
import { indicatorFor } from './indicatorFor'
import { pickDropTarget } from './pickDropTarget'
import { resolveDrop } from './resolveDrop'

type DragEvent = { source: ElementDragPayload; location: DragLocationHistory }

export function useEditorDropMonitor() {
  const store = useEditorStoreApi()

  useEffect(() => {
    const targetOf = ({ source, location }: DragEvent): DropTargetRecord | undefined =>
      pickDropTarget(
        store.state.doc,
        location.current.dropTargets,
        isNodeDrag(source.data) ? source.data.nodeId : null,
        location.current.input,
      )

    const paint = (event: DragEvent) => {
      const indicator = indicatorFor(targetOf(event), event.location.current.input)
      if (!indicator) {
        clearIndicators()
        return
      }
      setIndicator(indicator.surface, indicator.shape)
      setIndicator(indicator.surface === 'tree' ? 'canvas' : 'tree', { kind: 'none' })
    }

    return monitorForElements({
      canMonitor: ({ source }) => isEditorDrag(source.data),
      onDragStart(payload) {
        beginDragGeneration()
        paint(payload)
      },
      onDropTargetChange: paint,
      onDrag: paint,
      onDrop({ source, location }) {
        clearIndicators()

        const target = targetOf({ source, location })
        if (!target) return

        const { state, actions } = store
        const draggedId = isNodeDrag(source.data) ? source.data.nodeId : null
        const position = resolveDrop(state.doc, target, draggedId, location.current.input)
        if (!position) return

        const parentLabel = labelOf(state.doc.nodes[position.parentId])

        if (isNodeDrag(source.data)) {
          const moved = actions.moveNode(source.data.nodeId, position)
          if (moved) announce(`${source.data.label} moved into ${parentLabel}`)
          return
        }

        if (isPaletteDrag(source.data)) {
          const created = actions.insertNode(source.data.template, position)
          if (created) announce(`${source.data.label} inserted into ${parentLabel}`)
        }
      },
    })
  }, [store])
}
