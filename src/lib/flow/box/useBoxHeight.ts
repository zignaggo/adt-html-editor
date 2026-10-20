import { useBreakpoint, useEditor, useEditorSelector, useEditorStoreApi } from '../../components/Editor/context'
import type { NodeId } from '../../core/ids'
import { hasLockedDescendant } from '../../core/lock'
import { isStyled } from '../../core/model'
import type { StyleTarget } from '../../tailwind/variants'
import type { FlowTarget } from '../useFlowSelection'
import {
  heightClasses,
  heightFrames,
  innerSpaceClasses,
  measureHeight,
  readBoxMetrics,
  verticalPaddingClasses,
  type BoxMetrics,
  type HeightBlock,
  type HeightMeasure,
  type InnerAxis,
} from './boxHeight'

const NO_ID = '' as NodeId

export type BoxHeight = {
  frames: readonly HTMLElement[]
  blocked: HeightBlock | null
  read: () => BoxMetrics
  measure: (requested: number) => HeightMeasure
  heightOf: () => number
  innerSpaceOf: (axis: InnerAxis) => number
  commitHeight: (next: HeightMeasure, style?: string | null) => void
  setInnerSpace: (axis: InnerAxis, px: number) => void
}

function pxOf(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * The height and inner space of the selected box, as frames: the box plus the single-child
 * wrappers under it. Every write is a class at the live breakpoint, in one history entry.
 */
export function useBoxHeight(target: FlowTarget | null): BoxHeight | null {
  const store = useEditorStoreApi()
  const actions = useEditor()
  const breakpoint = useBreakpoint()
  const id = target?.id ?? NO_ID
  const lockedDescendant = useEditorSelector((state) =>
    id === NO_ID ? false : hasLockedDescendant(state.doc, state.locked, id),
  )

  if (!target) return null

  const styleTarget: StyleTarget = { breakpoint, state: null }
  const { frames, blocked } = heightFrames(target.element, { lockedDescendant })

  const classesOf = (nodeId: NodeId): readonly string[] => {
    const node = store.state.doc.nodes[nodeId]
    return node && isStyled(node) ? node.classes : []
  }

  const read = () => readBoxMetrics(frames)

  const write = (key: string, run: () => void) => {
    actions.transaction(run, { coalesceKey: `${key}:${target.id}` })
  }

  return {
    frames,
    blocked,
    read,
    measure: (requested) => measureHeight(read(), requested),

    heightOf: () => {
      const frame = frames[0]
      if (!frame) return 0
      return Math.round(frame.getBoundingClientRect().height / target.host.scale())
    },

    innerSpaceOf: (axis) => {
      const frame = frames[0]
      if (!frame) return 0
      const style = getComputedStyle(frame)
      return Math.round(pxOf(axis === 'y' ? style.paddingTop : style.paddingLeft))
    },

    commitHeight: (next, style) => {
      write('flow-height', () => {
        frames.forEach((frame, index) => {
          const frameId = frame.getAttribute('data-adt-id') as NodeId | null
          if (!frameId) return
          let classes = [...classesOf(frameId)]
          if (index === 0) {
            classes = heightClasses(classes, next.height, styleTarget, {
              center: frames.length > 1,
            })
          }
          classes = verticalPaddingClasses(classes, next.padding[index], styleTarget)
          actions.setClasses(frameId, classes)
        })
        if (style !== undefined) actions.setAttr(target.id, 'style', style)
      })
    },

    setInnerSpace: (axis, px) => {
      write(`flow-inner-${axis}`, () => {
        actions.setClasses(target.id, innerSpaceClasses(classesOf(target.id), axis, px, styleTarget))
      })
    },
  }
}
