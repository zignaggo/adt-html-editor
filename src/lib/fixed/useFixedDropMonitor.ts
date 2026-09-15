import { useEffect } from 'react'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import type { DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types'
import { isFixedPageTarget, isNodeDrag, isPaletteDrag } from '../dnd/data'
import { beginFixedDrag, finishFixedDrag, moveFixedDrag } from './fixedDrag'
import { fixedDragSession } from './fixedDragStore'
import { useFixedDragEnv } from './useFixedDragEnv'

function isOverPage(location: DragLocationHistory): boolean {
  return location.current.dropTargets.some((target) => isFixedPageTarget(target.data))
}

export function useFixedDropMonitor() {
  const getEnv = useFixedDragEnv()

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) =>
        isPaletteDrag(source.data) || (isNodeDrag(source.data) && source.data.surface === 'tree'),
      onDropTargetChange({ source, location }) {
        const env = getEnv()
        const over = isOverPage(location)
        const session = fixedDragSession()
        if (over && !session) {
          const element = isNodeDrag(source.data)
            ? env.pageElement?.querySelector<HTMLElement>(`[data-adt-id="${source.data.nodeId}"]`) ?? null
            : null
          beginFixedDrag(env, {
            memberIds: isNodeDrag(source.data) ? [source.data.nodeId] : [],
            template: isPaletteDrag(source.data) ? source.data.template : null,
            element,
            input: location.current.input,
            grabAtCenter: true,
          })
          moveFixedDrag(env, location.current.input)
          return
        }
        if (!over && session) finishFixedDrag(env, false)
      },
      onDrag({ location }) {
        if (fixedDragSession()) moveFixedDrag(getEnv(), location.current.input)
      },
      onDrop({ location }) {
        if (!fixedDragSession()) return
        const over = location.current.dropTargets[0]
        finishFixedDrag(getEnv(), Boolean(over && isFixedPageTarget(over.data)))
      },
    })
  }, [getEnv])
}
