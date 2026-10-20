import {
  useBreakpoint,
  useEditor,
  useEditorSelector,
  useEditorStoreApi,
  useRootId,
} from '../components/Editor/context'
import type { NodeId } from '../core/ids'
import { isStyled } from '../core/model'
import { clearInlineProps, commitStyle, withInlineProps } from '../style/commit'
import { whenStylesheetSettled } from '../tailwind/stylesheetStore'
import type { StyleTarget } from '../tailwind/variants'
import { allows } from './capabilities'
import { neighbourSlot } from './gestures/flowOrder'
import {
  SPACE_STEP_PX,
  TEXT_SIZE_STEP_PX,
  WIDTH_STEP_PERCENT,
  alignClasses,
  alignPreview,
  clampSpacePx,
  clampTextSizePx,
  clampWidthPercent,
  spaceClasses,
  spacePreview,
  textSizeClasses,
  textSizePreview,
  widthClasses,
  widthPreview,
  type FlowAlign,
} from './gestures/flowWrite'
import { contentWidthOf, type FlowTarget } from './useFlowSelection'

const NO_ID = '' as NodeId

export type FlowToolbar = {
  selectParent: (() => void) | null
  align: ((value: FlowAlign) => void) | null
  textSize: ((step: number) => void) | null
  width: ((step: number) => void) | null
  move: ((step: number) => void) | null
  canMove: (step: number) => boolean
  space: ((step: number) => void) | null
}

function pxOf(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function rootFontSize(element: HTMLElement): number {
  return pxOf(getComputedStyle(element.ownerDocument.documentElement).fontSize)
}

/**
 * The toolbar's writes: one click is one history entry of Tailwind classes at the live
 * breakpoint, previewed inline until the stylesheet covers the class it just wrote.
 */
export function useFlowToolbar(target: FlowTarget | null): FlowToolbar | null {
  const store = useEditorStoreApi()
  const actions = useEditor()
  const breakpoint = useBreakpoint()
  const rootId = useRootId()
  const orderId = (target?.orderElement.getAttribute('data-adt-id') as NodeId | null) ?? NO_ID
  const parentId = useEditorSelector((state) => state.doc.nodes[target?.id ?? NO_ID]?.parentId ?? null)
  const canEarlier = useEditorSelector((state) => neighbourSlot(state.doc, orderId, -1) !== null)
  const canLater = useEditorSelector((state) => neighbourSlot(state.doc, orderId, 1) !== null)

  if (!target) return null

  const styleTarget: StyleTarget = { breakpoint, state: null }
  const { element, inspection } = target
  const { flags } = inspection

  const classesOf = (id: NodeId): readonly string[] => {
    const node = store.state.doc.nodes[id]
    return node && isStyled(node) ? node.classes : []
  }

  const styleOf = (id: NodeId): string | null => {
    const node = store.state.doc.nodes[id]
    return node && isStyled(node) ? (node.attrs.style ?? null) : null
  }

  const write = (key: string, props: Record<string, string>, classes: string[]) => {
    const base = styleOf(target.id)
    const resting = clearInlineProps(base ?? undefined, Object.keys(props))
    element.setAttribute('style', withInlineProps(base, props))
    commitStyle(actions, target.id, { classes, style: resting }, `${key}:${target.id}`)
    void whenStylesheetSettled().then(() => {
      if (resting === null) element.removeAttribute('style')
      else element.setAttribute('style', resting)
    })
  }

  const canReorder = allows(inspection, 'reorder')
  const moveBy = (step: number) => {
    const slot = neighbourSlot(store.state.doc, orderId, step)
    const parent = store.state.doc.nodes[orderId]?.parentId
    if (slot === null || !parent) return
    actions.moveNode(orderId, { parentId: parent, index: slot })
  }

  return {
    selectParent:
      parentId !== null && parentId !== rootId ? () => actions.select(parentId) : null,

    align: allows(inspection, 'align')
      ? (value) => {
          const mode = flags.text ? 'text' : 'box'
          const options = { grid: flags.grid, blockify: flags.inline }
          write(
            'flow-align',
            alignPreview(value, mode, options),
            alignClasses(classesOf(target.id), value, mode, styleTarget, options),
          )
        }
      : null,

    textSize: flags.image
      ? null
      : (step) => {
          const current = pxOf(getComputedStyle(element).fontSize)
          const root = rootFontSize(element)
          const next = clampTextSizePx(current + step * TEXT_SIZE_STEP_PX)
          write(
            'flow-text-size',
            textSizePreview(next, root),
            textSizeClasses(classesOf(target.id), next, root, styleTarget),
          )
        },

    width:
      allows(inspection, 'resize') && !flags.text
        ? (step) => {
            const parent = element.parentElement
            const content = parent ? contentWidthOf(parent) : 0
            if (content <= 0) return
            const scale = target.host.scale()
            const current = clampWidthPercent(
              (element.getBoundingClientRect().width / scale / content) * 100,
            )
            const next = clampWidthPercent(current + step * WIDTH_STEP_PERCENT)
            write(
              'flow-width',
              widthPreview(next, flags.image),
              widthClasses(classesOf(target.id), next, flags.image, styleTarget),
            )
          }
        : null,

    move: canReorder ? moveBy : null,
    canMove: (step) => canReorder && (step < 0 ? canEarlier : canLater),

    space: allows(inspection, 'space')
      ? (step) => {
          const current = pxOf(getComputedStyle(element).marginBottom)
          const next = clampSpacePx(current + step * SPACE_STEP_PX)
          write(
            'flow-space',
            spacePreview(next),
            spaceClasses(classesOf(target.id), next, styleTarget),
          )
        }
      : null,
  }
}
