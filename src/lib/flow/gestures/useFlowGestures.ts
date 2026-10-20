import { useBreakpoint, useEditor, useEditorStoreApi } from '../../components/Editor/context'
import type { NodeId } from '../../core/ids'
import { isStyled } from '../../core/model'
import { clearInlineProps, commitStyle, withInlineProps } from '../../style/commit'
import type { StyleTarget } from '../../tailwind/variants'
import {
  CONTENT_HINT,
  heightPreview,
  measureHeight,
  type BoxMetrics,
  type HeightMeasure,
} from '../box/boxHeight'
import { useBoxHeight } from '../box/useBoxHeight'
import { allows } from '../capabilities'
import { flowGesture } from '../gesture/flowGestureStore'
import { useCanvasGesture } from '../gesture/useCanvasGesture'
import type { FlowGeometry, FlowTarget } from '../useFlowSelection'
import { pickSlot, reorderSlots, type ReorderSlot } from './flowOrder'
import {
  alignClasses,
  alignFromThirds,
  alignPreview,
  clampSpacePx,
  clampWidthPercent,
  spaceClasses,
  spacePreview,
  widthClasses,
  widthPreview,
  type AlignMode,
  type FlowAlign,
} from './flowWrite'

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se'

export type FlowGestures = {
  startMove: (event: PointerEvent) => void
  startResize: (corner: ResizeCorner, event: PointerEvent) => void
  startSpace: (event: PointerEvent) => void
  startHeight: (event: PointerEvent) => void
}

const AXIS_LOCK_PX = 5

const NO_GESTURES: FlowGestures = {
  startMove: () => {},
  startResize: () => {},
  startSpace: () => {},
  startHeight: () => {},
}

type MoveState = {
  geometry: FlowGeometry
  baseStyle: string | null
  mode: AlignMode
  grid: boolean
  blockify: boolean
  slots: ReorderSlot[] | null
  orderId: NodeId | null
  parentId: NodeId | null
  axis: 'x' | 'y' | null
  align: FlowAlign | null
  slot: ReorderSlot | null
}

type ResizeState = {
  geometry: FlowGeometry
  baseStyle: string | null
  corner: ResizeCorner
  startWidth: number
  image: boolean
  percent: number
}

type SpaceState = {
  geometry: FlowGeometry
  baseStyle: string | null
  startPx: number
  px: number
}

type HeightState = {
  geometry: FlowGeometry
  baseStyle: string | null
  metrics: BoxMetrics
  startPx: number
  measured: HeightMeasure
}

export function useFlowGestures(target: FlowTarget | null): FlowGestures {
  const store = useEditorStoreApi()
  const actions = useEditor()
  const breakpoint = useBreakpoint()
  const startGesture = useCanvasGesture()
  const box = useBoxHeight(target)

  if (!target) return NO_GESTURES

  const styleTarget: StyleTarget = { breakpoint, state: null }
  const { element, inspection, orderElement } = target

  const classesOf = (id: NodeId): readonly string[] => {
    const node = store.state.doc.nodes[id]
    return node && isStyled(node) ? node.classes : []
  }

  const styleOf = (id: NodeId): string | null => {
    const node = store.state.doc.nodes[id]
    return node && isStyled(node) ? (node.attrs.style ?? null) : null
  }

  const endSession = () => flowGesture.end()

  const startMove = (event: PointerEvent) => {
    const canAlign = allows(inspection, 'align')
    const canReorder = allows(inspection, 'reorder')
    if (!canAlign && !canReorder) return

    startGesture<MoveState>(event, {
      element,
      begin: () => {
        const geometry = target.measure()
        if (!geometry) return null

        const root = target.host.root()
        const orderId = orderElement.getAttribute('data-adt-id') as NodeId | null
        const parentId = orderId ? (store.state.doc.nodes[orderId]?.parentId ?? null) : null
        const slots =
          canReorder && root && parentId
            ? reorderSlots(store.state.doc, parentId, root, geometry.hostTop)
            : null

        flowGesture.begin({ kind: 'move', axis: null, guideTop: null, feedback: '' })

        return {
          geometry,
          baseStyle: styleOf(target.id),
          mode: inspection.flags.text ? 'text' : 'box',
          grid: inspection.flags.grid,
          blockify: inspection.flags.inline,
          slots,
          orderId,
          parentId,
          axis: null,
          align: null,
          slot: null,
        }
      },

      preview: (session, input) => {
        const state = session.state
        const { scale } = state.geometry
        const dx = (input.clientX - session.origin.clientX) / scale
        const dy = (input.clientY - session.origin.clientY) / scale

        if (state.axis === null) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_PX) return
          const horizontal = Math.abs(dx) >= Math.abs(dy)
          state.axis = horizontal && canAlign ? 'x' : state.slots ? 'y' : canAlign ? 'x' : null
          if (state.axis === null) return
        }

        if (state.axis === 'x') {
          const { box, parentBox } = state.geometry
          if (!parentBox) return
          const centerX = box.left + box.width / 2 + dx * scale
          const align = alignFromThirds(centerX, parentBox.left, parentBox.width)
          if (align === state.align) return
          state.align = align
          element.setAttribute(
            'style',
            withInlineProps(
              state.baseStyle,
              alignPreview(align, state.mode, { grid: state.grid, blockify: state.blockify }),
            ),
          )
          flowGesture.update({ axis: 'x', feedback: `Align ${align}` })
          return
        }

        if (!state.slots) return
        const slot = pickSlot(state.slots, input.clientY - state.geometry.hostTop)
        if (!slot || slot.index === state.slot?.index) return
        state.slot = slot
        flowGesture.update({ axis: 'y', guideTop: slot.y, feedback: 'Move here' })
      },

      commit: (session) => {
        const state = session.state

        if (state.axis === 'x' && state.align !== null) {
          const options = { grid: state.grid, blockify: state.blockify }
          const classes = alignClasses(
            classesOf(target.id),
            state.align,
            state.mode,
            styleTarget,
            options,
          )
          const style = clearInlineProps(
            state.baseStyle ?? undefined,
            Object.keys(alignPreview(state.align, state.mode, options)),
          )
          commitStyle(actions, target.id, { classes, style }, `flow-align:${target.id}`)
          return { style }
        }

        if (state.axis === 'y' && state.slot && state.orderId && state.parentId) {
          actions.moveNode(state.orderId, { parentId: state.parentId, index: state.slot.index })
        }
        return {}
      },

      onEnd: endSession,
    })
  }

  const startResize = (corner: ResizeCorner, event: PointerEvent) => {
    if (!allows(inspection, 'resize')) return

    startGesture<ResizeState>(event, {
      element,
      begin: () => {
        const geometry = target.measure()
        if (!geometry || geometry.contentWidth <= 0) return null
        flowGesture.begin({ kind: 'resize', axis: 'x', guideTop: null, feedback: '' })
        return {
          geometry,
          baseStyle: styleOf(target.id),
          corner,
          startWidth: geometry.box.width / geometry.scale,
          image: inspection.flags.image,
          percent: clampWidthPercent((geometry.box.width / geometry.scale / geometry.contentWidth) * 100),
        }
      },

      preview: (session, input) => {
        const state = session.state
        const dx = (input.clientX - session.origin.clientX) / state.geometry.scale
        const towardsStart = state.corner === 'nw' || state.corner === 'sw'
        const width = state.startWidth + (towardsStart ? -dx : dx)
        const percent = clampWidthPercent((width / state.geometry.contentWidth) * 100)
        if (percent === state.percent) return
        state.percent = percent
        element.setAttribute(
          'style',
          withInlineProps(state.baseStyle, widthPreview(percent, state.image)),
        )
        flowGesture.update({ feedback: `${percent}% of the row` })
      },

      commit: (session) => {
        const state = session.state
        const classes = widthClasses(classesOf(target.id), state.percent, state.image, styleTarget)
        const style = clearInlineProps(
          state.baseStyle ?? undefined,
          Object.keys(widthPreview(state.percent, state.image)),
        )
        commitStyle(actions, target.id, { classes, style }, `flow-width:${target.id}`)
        return { style }
      },

      onEnd: endSession,
    })
  }

  const startSpace = (event: PointerEvent) => {
    if (!allows(inspection, 'space')) return

    startGesture<SpaceState>(event, {
      element,
      begin: () => {
        const geometry = target.measure()
        if (!geometry) return null
        const startPx = Number.parseFloat(getComputedStyle(element).marginBottom || '0') || 0
        flowGesture.begin({ kind: 'space', axis: 'y', guideTop: null, feedback: '' })
        return { geometry, baseStyle: styleOf(target.id), startPx, px: clampSpacePx(startPx) }
      },

      preview: (session, input) => {
        const state = session.state
        const dy = (input.clientY - session.origin.clientY) / state.geometry.scale
        const px = clampSpacePx(state.startPx + dy)
        if (px === state.px) return
        state.px = px
        element.setAttribute('style', withInlineProps(state.baseStyle, spacePreview(px)))
        flowGesture.update({ feedback: `${px}px below` })
      },

      commit: (session) => {
        const state = session.state
        const classes = spaceClasses(classesOf(target.id), state.px, styleTarget)
        const style = clearInlineProps(state.baseStyle ?? undefined, Object.keys(spacePreview(state.px)))
        commitStyle(actions, target.id, { classes, style }, `flow-space:${target.id}`)
        return { style }
      },

      onEnd: endSession,
    })
  }

  const startHeight = (event: PointerEvent) => {
    if (!box || box.blocked !== null) return

    startGesture<HeightState>(event, {
      element,
      begin: () => {
        const geometry = target.measure()
        if (!geometry) return null
        const metrics = box.read()
        const startPx = geometry.box.height / geometry.scale
        flowGesture.begin({ kind: 'height', axis: 'y', guideTop: null, feedback: '' })
        return {
          geometry,
          baseStyle: styleOf(target.id),
          metrics,
          startPx,
          measured: measureHeight(metrics, startPx),
        }
      },

      preview: (session, input) => {
        const state = session.state
        const dy = (input.clientY - session.origin.clientY) / state.geometry.scale
        const next = measureHeight(state.metrics, state.startPx + dy)
        if (next.height === state.measured.height) return
        state.measured = next
        element.setAttribute(
          'style',
          withInlineProps(state.baseStyle, heightPreview(next.height, next.padding[0])),
        )
        flowGesture.update({ feedback: next.blocked ? CONTENT_HINT : `${next.height}px tall` })
      },

      commit: (session) => {
        const state = session.state
        const style = clearInlineProps(
          state.baseStyle ?? undefined,
          Object.keys(heightPreview(state.measured.height, state.measured.padding[0])),
        )
        box.commitHeight(state.measured, style)
        return { style }
      },

      onEnd: endSession,
    })
  }

  return { startMove, startResize, startSpace, startHeight }
}
