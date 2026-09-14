import type { RefObject } from 'react'
import type { NodeId } from '../../core/ids'
import type { AnyNode } from '../../core/model'
import { useCanvasDropTarget } from '../../dnd/useCanvasDropTarget'
import { useNodeDraggable } from '../../dnd/useNodeDraggable'
import { useFixedDraggable } from '../../fixed/useFixedDraggable'
import { useIsLocked, useLayoutMode } from '../Editor/context'

export function useCanvasNodeDnd(
  elementRef: RefObject<HTMLElement | null>,
  id: NodeId,
  node: AnyNode | undefined,
) {
  const isFixed = useLayoutMode() === 'fixed'
  const locked = useIsLocked(id)
  const canDrag = Boolean(node) && node?.kind !== 'text' && node?.kind !== 'comment'

  useNodeDraggable(elementRef, id, 'canvas', canDrag && !isFixed)
  useCanvasDropTarget(elementRef, id, !isFixed)
  useFixedDraggable(elementRef, id, canDrag && isFixed && !locked)
}
