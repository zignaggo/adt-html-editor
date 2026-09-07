import { useEffect } from 'react'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import type { DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types'
import { labelOf } from '../core/model'
import { useEditorStoreApi } from '../components/Editor/context'
import { isEditorDrag, isNodeDrag, isPaletteDrag } from './data'
import { beginDragGeneration, clearIndicators, setIndicator } from './dragStore'
import { indicatorFor } from './indicatorFor'
import { resolveDrop } from './resolveDrop'

export function useEditorDropMonitor() {
  const store = useEditorStoreApi()

  useEffect(() => {
    const paint = ({ location }: { location: DragLocationHistory }) => {
      const indicator = indicatorFor(location.current.dropTargets[0], location.current.input)
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

        const target = location.current.dropTargets[0]
        if (!target) return

        const state = store.getState()
        const draggedId = isNodeDrag(source.data) ? source.data.nodeId : null
        const position = resolveDrop(state.doc, target, draggedId, location.current.input)
        if (!position) return

        const parentLabel = labelOf(state.doc.nodes[position.parentId])

        if (isNodeDrag(source.data)) {
          const moved = state.moveNode(source.data.nodeId, position)
          if (moved) announce(`${source.data.label} movido para dentro de ${parentLabel}`)
          return
        }

        if (isPaletteDrag(source.data)) {
          const created = state.insertNode(source.data.template, position)
          if (created) announce(`${source.data.label} inserido em ${parentLabel}`)
        }
      },
    })
  }, [store])
}
