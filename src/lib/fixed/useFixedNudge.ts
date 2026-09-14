import type { KeyboardEvent } from 'react'
import { isStyled } from '../core/model'
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
    const { selectedId } = state
    if (!selectedId || state.locked[selectedId]) return false
    const node = state.doc.nodes[selectedId]
    if (!node || !isStyled(node)) return false

    const root = canvasRootRef.current
    const element = root?.querySelector<HTMLElement>(`[data-adt-id="${selectedId}"]`)
    if (!root || !element) return false

    const current = readLayoutBox(element, root)
    const origin = styleOriginOf(element, root)
    const step = event.shiftKey ? FAST_STEP : STEP

    event.preventDefault()
    actions.placeNode(selectedId, {
      style: positionDeclarations(
        node.attrs.style,
        current.x + delta[0] * step - origin.x,
        current.y + delta[1] * step - origin.y,
        precision,
      ),
      coalesce: true,
    })
    return true
  }
}
