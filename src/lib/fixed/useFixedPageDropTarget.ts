import { useEffect, type RefObject } from 'react'
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/utils/combine'
import { fixedPageTarget, isEditorDrag } from '../dnd/data'

export function useFixedPageDropTarget(scrollRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    return combine(
      dropTargetForElements({
        element,
        canDrop: ({ source }) => isEditorDrag(source.data),
        getData: () => fixedPageTarget(),
        getDropEffect: () => 'move',
      }),
      autoScrollForElements({ element }),
    )
  }, [scrollRef])
}
