import { useSelector } from '@tanstack/react-store'
import { useEffect, useState } from 'react'
import { useEditor, useEditorStoreApi, useNode } from '../../components/Editor/context'
import type { NodeId } from '../../core/ids'
import { isStyled } from '../../core/model'
import { clearInlineProps, withInlineProps } from '../../style/commit'
import { blockReasonOf, type BlockReason } from '../capabilities'
import { setRepositionArmed } from '../component/repositionStore'
import { useCanvasGesture } from '../gesture/useCanvasGesture'
import type { FlowTarget } from '../useFlowSelection'
import {
  NO_TRANSLATION,
  ancestorScale,
  offsetTranslation,
  resolveTranslation,
  translationMatches,
  type Translation,
} from './translation'
import { setTransformActive, transformUi } from './transformStore'

const EMPTY_ID = '' as NodeId

function translateIn(style: string | undefined): string | undefined {
  const match = style?.match(/(?:^|;)s*translates*:s*([^;]+)/)
  return match ? match[1].trim() : undefined
}

export const TRANSFORM_ATTRIBUTE = 'data-responsive-transform'

export const NUDGE_PX = 1
export const NUDGE_COARSE_PX = 10

export type FreeTransform = {
  offset: Translation
  blocked: BlockReason | null
  active: boolean
  /** The cascade is winning over the inline value — the element did not go where it was sent. */
  conflict: boolean
  /** There is an inline offset to clear. A translate coming from a class is not ours to reset. */
  canReset: boolean
  /** Nudge, for whoever owns the keyboard. */

  toggle: () => void
  setAxis: (axis: 'x' | 'y', value: number) => void
  nudge: (dx: number, dy: number) => void
  reset: () => void
  start: (event: PointerEvent) => void
}

type DragState = {
  declared: string | undefined
  scale: number
}


export function useFreeTransform(target: FlowTarget | null): FreeTransform | null {
  const store = useEditorStoreApi()
  const actions = useEditor()
  const startGesture = useCanvasGesture()
  const active = useSelector(transformUi, (ui) => ui.active)
  const [conflict, setConflict] = useState(false)

  // Subscribed, not read off the store: the inspector has to follow what the canvas writes.
  const node = useNode(target?.id ?? EMPTY_ID)
  const element = target?.element ?? null
  const blocked = target ? blockReasonOf(target.inspection, 'transform') : null
  const usable = target !== null && element !== null && blocked === null

  const rendered = node && isStyled(node) ? node.attrs.style : undefined

  const styleOf = (): string | undefined => {
    if (!target) return undefined
    const current = store.state.doc.nodes[target.id]
    return current && isStyled(current) ? current.attrs.style : undefined
  }

  const declaredOf = (): string | undefined => translateIn(styleOf())

  const styleFor = (next: string): string | null =>
    next === 'none'
      ? clearInlineProps(styleOf(), ['translate'])
      : withInlineProps(styleOf(), { translate: next })

  // Resolved from the model, never from the DOM: the style attribute lands one effect later,
  // and reading it here would always show the previous position. A translate coming from a
  // class is not ours to report either — `canReset` says the same thing.
  const declared = translateIn(rendered)
  const offset = element ? resolveTranslation(declared, element) : NO_TRANSLATION

  const move = (dx: number, dy: number) => {
    if (!usable || !target || !element || (dx === 0 && dy === 0)) return
    const expected: Translation = { x: offset.x + dx, y: offset.y + dy }
    actions.setAttr(target.id, 'style', styleFor(offsetTranslation(declaredOf(), dx, dy)) || null)
    requestAnimationFrame(() => setConflict(!translationMatches(element, expected)))
  }

  useEffect(() => {
    if (!usable && active) setTransformActive(false)
  }, [usable, active])

  useEffect(() => {
    if (!element || !active) return
    element.setAttribute(TRANSFORM_ATTRIBUTE, '')
    return () => element.removeAttribute(TRANSFORM_ATTRIBUTE)
  }, [element, active])

  if (!target || !element) return null

  return {
    offset,
    blocked,
    active,
    conflict,
    canReset: declared !== undefined,

    toggle: () => {
      if (blocked !== null) return
      const next = !active
      if (next) setRepositionArmed(false)
      setTransformActive(next)
    },

    setAxis: (axis, value) => {
      const delta = axis === 'x' ? value - offset.x : value - offset.y
      if (!Number.isFinite(delta)) return
      move(axis === 'x' ? delta : 0, axis === 'x' ? 0 : delta)
    },

    nudge: move,

    reset: () => {
      if (!declaredOf()) return
      actions.setAttr(target.id, 'style', clearInlineProps(styleOf(), ['translate']) || null)
      setConflict(false)
    },

    start: (event: PointerEvent) => {
      if (!usable || !active) return

      startGesture<DragState>(event, {
        element,
        begin: () => {
          const root = target.host.root()
          if (!root) return null
          const inner = ancestorScale(element, root)
          if (inner === null) return null
          return { declared: declaredOf(), scale: target.host.scale() * inner }
        },

        preview: (session, input) => {
          const { scale, declared } = session.state
          const dx = (input.clientX - session.origin.clientX) / scale
          const dy = (input.clientY - session.origin.clientY) / scale
          element.setAttribute(
            'style',
            withInlineProps(styleOf(), { translate: offsetTranslation(declared, dx, dy) }),
          )
        },

        commit: (session, input) => {
          const { scale, declared } = session.state
          const dx = (input.clientX - session.origin.clientX) / scale
          const dy = (input.clientY - session.origin.clientY) / scale
          const style = styleFor(offsetTranslation(declared, dx, dy))
          actions.setAttr(target.id, 'style', style || null)
          return { style: style || null }
        },
      })
    },
  }
}
