import { useEditor, useEditorStoreApi } from '../../components/Editor/context'
import type { NodeId } from '../../core/ids'
import { isStyled } from '../../core/model'
import { BASE_TARGET } from '../../tailwind/variants'
import { fitClasses, type FloatSide } from '../component/componentCommit'
import { componentOf, layoutChildren, wrapperOfImage } from '../component/componentLayout'
import type { FlowTarget } from '../useFlowSelection'
import { placeBeside } from './besideColumns'
import { updateLayout, type LayoutEdit } from './layoutOperations'
import {
  canCentreContents,
  centreChildEdits,
  centreContainerEdits,
  columnsContainerEdits,
  layoutContainerOf,
  rowChildEdits,
  rowContainerEdits,
  stackContainerEdits,
  widthShareOf,
  type RowAlign,
} from './layoutPresets'
import { applyTextFlow, planTextFlow } from './textFlow'

export type LayoutActionId =
  | 'select-component'
  | 'row-centres'
  | 'row-tops'
  | 'row-bottoms'
  | 'centre-contents'
  | 'wrap-left'
  | 'wrap-right'
  | 'beside-previous'
  | 'beside-next'
  | 'equal-columns'
  | 'stack'
  | 'switch-order'

export type LayoutAction = {
  id: LayoutActionId
  label: string
  blocked: string | null
  run: () => void
}

export type LayoutMenu = {
  container: HTMLElement
  actions: LayoutAction[]
}

const ROW_ALIGNS: ReadonlyArray<{ id: LayoutActionId; align: RowAlign; label: string }> = [
  { id: 'row-centres', align: 'centres', label: 'Row · align centres' },
  { id: 'row-tops', align: 'tops', label: 'Row · align tops' },
  { id: 'row-bottoms', align: 'bottoms', label: 'Row · align bottoms' },
]

const NEEDS_TWO = 'needs at least two children'

const NEEDS_EXACTLY_TWO = 'needs exactly two children'

const NEEDS_PARAGRAPHS = 'needs one to four paragraphs or headings'

const NOTHING_TO_WRAP = 'nothing here for text to wrap around'

const WHOLE_PIECE = 'this is already the whole piece'

function idOf(element: HTMLElement): NodeId | null {
  return (element.getAttribute('data-adt-id') as NodeId | null) ?? null
}

export function useLayoutMenu(target: FlowTarget | null): LayoutMenu | null {
  const store = useEditorStoreApi()
  const actions = useEditor()

  if (!target) return null

  const component = componentOf(target.element)
  const container = layoutContainerOf(component)
  const children = layoutChildren(container)

  const classesOf = (id: NodeId): readonly string[] => {
    const node = store.state.doc.nodes[id]
    return node && isStyled(node) ? node.classes : []
  }

  const styleOf = (id: NodeId): string | undefined => {
    const node = store.state.doc.nodes[id]
    return node && isStyled(node) ? node.attrs.style : undefined
  }

  const write = (id: NodeId, edits: readonly LayoutEdit[]) => {
    const next = updateLayout({ classes: classesOf(id), style: styleOf(id) }, edits, BASE_TARGET)
    actions.setClasses(id, next.classes)
    if (next.style !== undefined) actions.setAttr(id, 'style', next.style)
  }

  const fit = (id: NodeId, reference: HTMLElement | null) => {
    const stripPadding = reference !== null && wrapperOfImage(reference) !== null
    actions.setClasses(id, fitClasses(classesOf(id), BASE_TARGET, { stripPadding }))
  }

  const run = (id: LayoutActionId, body: () => void) => {
    actions.transaction(body, { coalesceKey: `layout:${id}` })
  }

  const containerId = idOf(container)

  const applyToChildren = (edits: (child: HTMLElement) => readonly LayoutEdit[]) => {
    for (const child of children) {
      const childId = idOf(child)
      if (childId) write(childId, edits(child))
    }
  }

  const applyRow = (id: LayoutActionId, align: RowAlign) => {
    if (!containerId) return
    const width = container.clientWidth
    run(id, () => {
      write(containerId, rowContainerEdits(align))
      applyToChildren((child) => rowChildEdits(widthShareOf(child, width)))
    })
  }

  const applyGrid = (id: LayoutActionId, edits: readonly LayoutEdit[]) => {
    if (!containerId) return
    run(id, () => {
      write(containerId, edits)
      for (const child of children) {
        const childId = idOf(child)
        if (childId) actions.setClasses(childId, fitClasses(classesOf(childId), BASE_TARGET))
      }
    })
  }

  const applyCentre = () => {
    if (!containerId) return
    run('centre-contents', () => {
      write(containerId, centreContainerEdits())
      applyToChildren(centreChildEdits)
    })
  }

  const applySwitch = () => {
    if (!containerId || children.length !== 2) return
    const secondId = idOf(children[1])
    if (!secondId) return
    run('switch-order', () => {
      actions.moveNode(secondId, { parentId: containerId, index: 0 })
    })
  }

  const applyWrap = (side: FloatSide) => {
    const plan = planTextFlow(component, side)
    if (!plan) return
    run(side === 'left' ? 'wrap-left' : 'wrap-right', () => {
      applyTextFlow(plan, {
        actions,
        doc: () => store.state.doc,
        idOf,
        classesOf,
        styleOf,
      })
    })
  }

  const siblingOf = (step: -1 | 1): HTMLElement | null => {
    const parent = component.parentElement
    if (!parent) return null
    const siblings = layoutChildren(parent)
    const at = siblings.indexOf(component)
    if (at < 0) return null
    return siblings[at + step] ?? null
  }

  const applyBeside = (step: -1 | 1) => {
    const sibling = siblingOf(step)
    const id = idOf(component)
    const anchorId = sibling ? idOf(sibling) : null
    if (!sibling || !id || !anchorId) return
    run(step === -1 ? 'beside-previous' : 'beside-next', () => {
      placeBeside({
        actions,
        doc: store.state.doc,
        id,
        anchorId,
        side: step === -1 ? 'right' : 'left',
        anchorElement: sibling,
        fit,
      })
    })
  }

  const componentId = idOf(component)
  const wrapPlan = planTextFlow(component, 'left')

  const menu: LayoutAction[] = [
    {
      id: 'select-component',
      label: 'Select whole component',
      blocked: component === target.element || !componentId ? WHOLE_PIECE : null,
      run: () => componentId && actions.select(componentId),
    },
    ...ROW_ALIGNS.map((entry) => ({
      id: entry.id,
      label: entry.label,
      blocked: children.length < 2 ? NEEDS_TWO : null,
      run: () => applyRow(entry.id, entry.align),
    })),
    {
      id: 'centre-contents',
      label: 'Centre contents',
      blocked: canCentreContents(children) ? null : NEEDS_PARAGRAPHS,
      run: applyCentre,
    },
    {
      id: 'wrap-left',
      label: 'Wrap text · object on left',
      blocked: wrapPlan ? null : NOTHING_TO_WRAP,
      run: () => applyWrap('left'),
    },
    {
      id: 'wrap-right',
      label: 'Wrap text · object on right',
      blocked: wrapPlan ? null : NOTHING_TO_WRAP,
      run: () => applyWrap('right'),
    },
    {
      id: 'beside-previous',
      label: 'Side by side with previous',
      blocked: siblingOf(-1) ? null : 'no block before this one',
      run: () => applyBeside(-1),
    },
    {
      id: 'beside-next',
      label: 'Side by side with next',
      blocked: siblingOf(1) ? null : 'no block after this one',
      run: () => applyBeside(1),
    },
    {
      id: 'equal-columns',
      label: 'Side by side · equal columns',
      blocked: children.length < 2 ? NEEDS_TWO : null,
      run: () => applyGrid('equal-columns', columnsContainerEdits()),
    },
    {
      id: 'stack',
      label: 'One below another',
      blocked: children.length < 2 ? NEEDS_TWO : null,
      run: () => applyGrid('stack', stackContainerEdits()),
    },
    {
      id: 'switch-order',
      label: 'Switch order',
      blocked: children.length === 2 ? null : NEEDS_EXACTLY_TWO,
      run: applySwitch,
    },
  ]

  return { container, actions: menu }
}
