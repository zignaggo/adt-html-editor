import { useEditor, useEditorStoreApi, useRootId } from '../../components/Editor/context'
import type { NodeId } from '../../core/ids'
import { BASE_TARGET } from '../../tailwind/variants'
import type { FloatSide } from '../component/componentCommit'
import { layoutChildren } from '../component/componentLayout'
import { wrapTogether } from '../layout/besideColumns'
import { updateLayout, type LayoutEdit } from '../layout/layoutOperations'
import {
  columnsContainerEdits,
  rowChildEdits,
  rowContainerEdits,
  stackContainerEdits,
  widthShareOf,
  type RowAlign,
} from '../layout/layoutPresets'
import { createLayoutWriter } from '../layout/layoutWriter'
import { applyTextFlow, groupTextFlow } from '../layout/textFlow'
import type { FlowGroup } from './useFlowGroup'

export type GroupActionId =
  | 'row-centres'
  | 'row-tops'
  | 'row-bottoms'
  | 'wrap-left'
  | 'wrap-right'
  | 'equal-columns'
  | 'stack'

export type GroupAction = {
  id: GroupActionId
  label: string
  blocked: string | null
  run: () => void
}

export type GroupMenu = {
  count: number
  actions: GroupAction[]
}

const ROW_ALIGNS: ReadonlyArray<{ id: GroupActionId; align: RowAlign; label: string }> = [
  { id: 'row-centres', align: 'centres', label: 'Row · align centres' },
  { id: 'row-tops', align: 'tops', label: 'Row · align tops' },
  { id: 'row-bottoms', align: 'bottoms', label: 'Row · align bottoms' },
]

const WRAPPER_CLASSES: readonly string[] = ['w-full', 'clear-both']

const NOTHING_TO_WRAP = 'nothing here for text to wrap around'

function wrapperClassesFor(edits: readonly LayoutEdit[]): string[] {
  return updateLayout({ classes: [...WRAPPER_CLASSES] }, edits, BASE_TARGET).classes
}

export function useGroupLayout(group: FlowGroup | null): GroupMenu | null {
  const store = useEditorStoreApi()
  const actions = useEditor()
  const rootId = useRootId()

  if (!group || group.can !== true || !group.parent) return null

  const { ids, members, parent, parentId } = group
  const writer = createLayoutWriter(store, actions)

  const wholeId =
    parentId !== null && parentId !== rootId && layoutChildren(parent).length === members.length
      ? parentId
      : null

  const elementOf = (id: NodeId): HTMLElement | null => members[ids.indexOf(id)] ?? null

  const run = (id: GroupActionId, body: () => void) => {
    actions.transaction(
      () => {
        body()
        actions.selectMany(ids)
      },
      { coalesceKey: `group:${id}` },
    )
  }

  const wrap = (classes: readonly string[], fit: (id: NodeId) => void): NodeId | null =>
    wrapTogether({ actions, doc: () => store.state.doc, ids, classes, fit })

  const fitMember = (id: NodeId) => writer.fit(id, elementOf(id))

  const applyRow = (id: GroupActionId, align: RowAlign) => {
    const width = parent.clientWidth
    const shares = members.map((member) => widthShareOf(member, width))
    const edits = rowContainerEdits(align)

    run(id, () => {
      const containerId = wholeId ?? wrap(wrapperClassesFor(edits), () => {})
      if (!containerId) return
      if (wholeId) writer.write(wholeId, edits)
      ids.forEach((memberId, index) => writer.write(memberId, rowChildEdits(shares[index])))
    })
  }

  const applyGrid = (id: GroupActionId, edits: readonly LayoutEdit[]) => {
    run(id, () => {
      if (!wholeId) {
        wrap(wrapperClassesFor(edits), fitMember)
        return
      }
      writer.write(wholeId, edits)
      for (const memberId of ids) fitMember(memberId)
    })
  }

  const applyWrap = (side: FloatSide) => {
    const plan = groupTextFlow(members, side)
    if (!plan) return
    run(side === 'left' ? 'wrap-left' : 'wrap-right', () => {
      applyTextFlow(plan, {
        actions,
        doc: () => store.state.doc,
        idOf: writer.idOf,
        classesOf: writer.classesOf,
        styleOf: writer.styleOf,
      })
    })
  }

  const wrapPlan = groupTextFlow(members, 'left')

  return {
    count: members.length,
    actions: [
      ...ROW_ALIGNS.map((entry) => ({
        id: entry.id,
        label: entry.label,
        blocked: null,
        run: () => applyRow(entry.id, entry.align),
      })),
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
        id: 'equal-columns',
        label: 'Side by side · equal columns',
        blocked: null,
        run: () => applyGrid('equal-columns', columnsContainerEdits(members.length)),
      },
      {
        id: 'stack',
        label: 'One below another',
        blocked: null,
        run: () => applyGrid('stack', stackContainerEdits()),
      },
    ],
  }
}
