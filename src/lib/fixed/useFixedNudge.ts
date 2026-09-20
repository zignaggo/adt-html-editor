import type { KeyboardEvent } from 'react'
import { isStyled } from '../core/model'
import type { PlaceUpdate } from '../core/store'
import { useEditorContext, useEditorStoreApi, useFixedLayout } from '../components/Editor/context'
import { positionDeclarations } from './position'
import { styleOriginOf } from './transform/elementTransform'
import { readLayoutBox } from './transform/layoutBox'

const STEP = 1
const FAST_STEP = 10

const DELTAS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
}

export function useFixedNudge(): (event: KeyboardEvent<HTMLElement>) => boolean {
  const store = useEditorStoreApi()
  const { canvasRootRef } = useEditorContext()
  const { precision } = useFixedLayout()

  return (event) => {
    const delta = DELTAS[event.key]
    if (!delta || event.altKey || event.metaKey || event.ctrlKey) return false
    if ((event.target as HTMLElement).isContentEditable) return false

    const { state, actions } = store
    const { selectedIds } = state
    if (selectedIds.length === 0) return false

    const root = canvasRootRef.current
    if (!root) return false

    const step = event.shiftKey ? FAST_STEP : STEP
    const updates: PlaceUpdate[] = []
    for (const id of selectedIds) {
      if (state.locked[id]) continue
      const node = state.doc.nodes[id]
      if (!node || !isStyled(node)) continue
      const element = root.querySelector<HTMLElement>(`[data-adt-id="${id}"]`)
      if (!element) continue
      const current = readLayoutBox(element, root)
      const origin = styleOriginOf(element, root)
      updates.push({
        id,
        style: positionDeclarations(
          node.attrs.style,
          current.x + delta[0] * step - origin.x,
          current.y + delta[1] * step - origin.y,
          precision,
        ),
      })
    }
    if (updates.length === 0) return false

    event.preventDefault()
    actions.placeNodes(updates, { coalesce: true })
    return true
  }
}
