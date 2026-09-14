import type { KeyboardEvent } from 'react'
import { isStyled } from '../../core/model'
import { useEditorContext, useEditorStoreApi, useFixedLayout } from '../../components/Editor/context'
import { sizeDeclarations } from '../position'
import { readElementTransform } from './elementTransform'
import { readLayoutBox } from './layoutBox'
import { withRotation } from './transformValue'

const SIZE_STEP = 1
const FAST_SIZE_STEP = 10
const ANGLE_STEP = 1
const FAST_ANGLE_STEP = 15

const SIZE_DELTAS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
}

const ANGLE_DELTAS: Record<string, number> = {
  '[': -1,
  ']': 1,
  '{': -1,
  '}': 1,
}

export function useTransformKeys(): (event: KeyboardEvent<HTMLElement>) => boolean {
  const store = useEditorStoreApi()
  const { canvasRootRef } = useEditorContext()
  const { precision } = useFixedLayout()

  return (event) => {
    if ((event.target as HTMLElement).isContentEditable) return false
    const sizeDelta = event.ctrlKey || event.metaKey ? SIZE_DELTAS[event.key] : undefined
    const angleDelta = event.ctrlKey || event.metaKey || event.altKey ? undefined : ANGLE_DELTAS[event.key]
    if (!sizeDelta && angleDelta === undefined) return false
    if (sizeDelta && event.altKey) return false

    const { state, actions } = store
    const { selectedId } = state
    if (!selectedId || state.locked[selectedId]) return false
    const node = state.doc.nodes[selectedId]
    if (!node || !isStyled(node)) return false
    const root = canvasRootRef.current
    const element = root?.querySelector<HTMLElement>(`[data-adt-id="${selectedId}"]`)
    if (!root || !element) return false

    event.preventDefault()
    const style = node.attrs.style
    const box = readLayoutBox(element, root)

    if (sizeDelta) {
      const step = event.shiftKey ? FAST_SIZE_STEP : SIZE_STEP
      const width = sizeDelta[0] ? Math.max(1, box.width + sizeDelta[0] * step) : null
      const height = sizeDelta[1] ? Math.max(1, box.height + sizeDelta[1] * step) : null
      actions.placeNode(selectedId, {
        style: sizeDeclarations(style, width, height, precision),
        coalesce: true,
      })
      return true
    }

    const transform = readElementTransform(element, style, box)
    const step = event.shiftKey ? FAST_ANGLE_STEP : ANGLE_STEP
    actions.placeNode(selectedId, {
      style: withRotation(style, transform.angle + (angleDelta ?? 0) * step - transform.base),
      coalesce: true,
    })
    return true
  }
}
