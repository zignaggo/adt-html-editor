import { useSelector } from '@tanstack/react-store'
import { useBreakpoint, useEditor, useEditorStoreApi } from '../../components/Editor/context'
import type { NodeId } from '../../core/ids'
import { childrenOf, isStyled } from '../../core/model'
import { setIndicator } from '../../dnd/dragStore'
import type { StyleTarget } from '../../tailwind/variants'
import { flowGesture } from '../gesture/flowGestureStore'
import { useCanvasGesture } from '../gesture/useCanvasGesture'
import { placeBeside } from '../layout/besideColumns'
import { applyTextFlow, planTextFlow } from '../layout/textFlow'
import type { FlowTarget } from '../useFlowSelection'
import { fitClasses, type FloatSide } from './componentCommit'
import { dropIndicator, dropLabel, resolveComponentDrop, type ComponentDrop } from './componentDrop'
import {
  componentBlock,
  componentOf,
  looksLikeComponent,
  wrapperOfImage,
  type ComponentBlock,
} from './componentLayout'
import { repositionUi, setRepositionArmed } from './repositionStore'
import { setTransformActive } from '../transform/transformStore'

export type RepositionOutcome = 'moved' | 'same-place' | 'no-target'

export type Reposition = {
  component: HTMLElement
  blocked: ComponentBlock | null
  armed: boolean
  toggle: () => void
  start: (event: PointerEvent) => void
  /** True when a plain drag on this piece should reposition it instead of aligning it. */
  routes: boolean
}

type RepositionState = {
  component: HTMLElement
  componentId: NodeId
  rect: DOMRect
  hostLeft: number
  hostTop: number
  drop: ComponentDrop | null
}

const FEEDBACK: Record<RepositionOutcome, string> = {
  moved: 'Moved',
  'same-place': 'Already here',
  'no-target': 'No place to drop',
}

function idOf(element: HTMLElement): NodeId | null {
  return (element.getAttribute('data-adt-id') as NodeId | null) ?? null
}

export function useReposition(target: FlowTarget | null): Reposition | null {
  const store = useEditorStoreApi()
  const actions = useEditor()
  const breakpoint = useBreakpoint()
  const startGesture = useCanvasGesture()
  const armed = useSelector(repositionUi, (ui) => ui.armed)

  if (!target) return null

  const styleTarget: StyleTarget = { breakpoint, state: null }
  const component = componentOf(target.element)
  const blocked = componentBlock(component)
  const componentId = idOf(component)

  const classesOf = (id: NodeId): readonly string[] => {
    const node = store.state.doc.nodes[id]
    return node && isStyled(node) ? node.classes : []
  }

  const styleOf = (id: NodeId): string | undefined => {
    const node = store.state.doc.nodes[id]
    return node && isStyled(node) ? node.attrs.style : undefined
  }

  const fitInto = (id: NodeId, element: HTMLElement | null) => {
    const stripPadding = element !== null && wrapperOfImage(element) !== null
    actions.setClasses(id, fitClasses(classesOf(id), styleTarget, { stripPadding }))
  }

  const reorder = (drop: ComponentDrop, id: NodeId): RepositionOutcome => {
    const targetId = idOf(drop.target)
    if (!targetId) return 'no-target'
    const { doc } = store.state

    const parentId = drop.kind === 'inside' ? targetId : (doc.nodes[targetId]?.parentId ?? null)
    if (!parentId) return 'no-target'

    const index =
      drop.kind === 'inside'
        ? childrenOf(doc, parentId).length
        : childrenOf(doc, parentId).indexOf(targetId) + (drop.kind === 'after' ? 1 : 0)
    if (index < 0) return 'no-target'

    const currentParent = doc.nodes[id]?.parentId ?? null
    const oldIndex = currentParent ? childrenOf(doc, currentParent).indexOf(id) : -1
    const settled = parentId === currentParent && oldIndex < index ? index - 1 : index
    if (parentId === currentParent && settled === oldIndex) return 'same-place'

    const changedParent = parentId !== currentParent
    return actions.transaction(() => {
      if (!actions.moveNode(id, { parentId, index })) return 'no-target'
      if (changedParent) fitInto(id, drop.target.parentElement)
      return 'moved'
    }, { coalesceKey: `reposition:${id}` })
  }

  const beside = (drop: ComponentDrop, id: NodeId): RepositionOutcome => {
    const targetId = idOf(drop.target)
    if (!targetId) return 'no-target'

    return actions.transaction(() => {
      const placed = placeBeside({
        actions,
        doc: store.state.doc,
        id,
        anchorId: targetId,
        side: drop.kind === 'left' ? 'left' : 'right',
        anchorElement: drop.target,
        fit: fitInto,
      })
      return placed ? 'moved' : 'no-target'
    }, { coalesceKey: `reposition:${id}` })
  }

  const wrapText = (drop: ComponentDrop, id: NodeId): RepositionOutcome => {
    const side: FloatSide = drop.kind === 'float-left' ? 'left' : 'right'
    const plan = planTextFlow(component, side, undefined, drop.target)
    if (!plan) return 'no-target'

    return actions.transaction(() => {
      const applied = applyTextFlow(plan, {
        actions,
        doc: () => store.state.doc,
        idOf,
        classesOf,
        styleOf,
      })
      return applied ? 'moved' : 'no-target'
    }, { coalesceKey: `reposition:${id}` })
  }

  const apply = (drop: ComponentDrop | null, id: NodeId): RepositionOutcome => {
    if (!drop) return 'no-target'
    if (drop.kind === 'left' || drop.kind === 'right') return beside(drop, id)
    if (drop.kind === 'float-left' || drop.kind === 'float-right') return wrapText(drop, id)
    return reorder(drop, id)
  }

  const start = (event: PointerEvent) => {
    if (blocked !== null || componentId === null) return

    startGesture<RepositionState>(event, {
      element: component,
      begin: () => {
        const geometry = target.measure()
        const root = target.host.root()
        if (!geometry || !root) return null

        flowGesture.begin({
          kind: 'reposition',
          axis: null,
          guideTop: null,
          feedback: '',
          ghost: null,
        })

        return {
          component,
          componentId,
          rect: component.getBoundingClientRect(),
          hostLeft: geometry.hostLeft,
          hostTop: geometry.hostTop,
          drop: null,
        }
      },

      preview: (session, input) => {
        const state = session.state
        const root = target.host.root()
        if (!root) return

        const dx = input.clientX - session.origin.clientX
        const dy = input.clientY - session.origin.clientY

        const drop = resolveComponentDrop(input, root, state.component)
        state.drop = drop
        setIndicator('canvas', drop ? dropIndicator(drop) : { kind: 'none' })

        flowGesture.update({
          feedback: drop ? dropLabel(drop) : FEEDBACK['no-target'],
          ghost: {
            left: state.rect.left - state.hostLeft + dx,
            top: state.rect.top - state.hostTop + dy,
            width: state.rect.width,
            height: state.rect.height,
          },
        })
      },

      commit: (session) => {
        const outcome = apply(session.state.drop, session.state.componentId)
        flowGesture.update({ feedback: FEEDBACK[outcome], ghost: null })
      },

      onEnd: () => {
        setIndicator('canvas', { kind: 'none' })
        flowGesture.end()
      },
    })
  }

  return {
    component,
    blocked,
    armed,
    toggle: () => {
      if (!armed) setTransformActive(false)
      setRepositionArmed(!armed)
    },
    start,
    routes: blocked === null && (armed || looksLikeComponent(component)),
  }
}
