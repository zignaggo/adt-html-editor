import { useEffect, useState } from 'react'
import { useCanvasHost, type CanvasHost } from '../../components/Canvas/useCanvasHost'
import {
  useDirectControls,
  useCanvasRoot,
  useEditorSelector,
  useEditorStoreApi,
} from '../../components/Editor/context'
import type { NodeId } from '../../core/ids'
import { isLockedAnywhere } from '../../core/lock'
import { idOf } from '../layout/layoutWriter'
import { boxOf, contentWidthOf, type FlowBox } from '../useFlowSelection'
import { inspectGroup, type GroupBlock } from './groupMembers'

export type FlowGroupGeometry = {
  box: FlowBox
  boxes: FlowBox[]
  parentBox: FlowBox | null
  contentWidth: number
  hostLeft: number
  hostTop: number
  hostWidth: number
  hostHeight: number
  scale: number
}

export type FlowGroup = {
  ids: readonly NodeId[]
  members: readonly HTMLElement[]
  parent: HTMLElement | null
  parentId: NodeId | null
  can: true | GroupBlock
  host: CanvasHost
  measure: () => FlowGroupGeometry | null
}

type Resolved = {
  members: HTMLElement[]
  parent: HTMLElement | null
  can: true | GroupBlock
}

const EMPTY_IDS: readonly NodeId[] = Object.freeze([]) as readonly NodeId[]

function sameResolution(a: Resolved, b: Resolved): boolean {
  if (a.can !== b.can || a.parent !== b.parent) return false
  if (a.members.length !== b.members.length) return false
  return a.members.every((member, index) => member === b.members[index])
}

function unionOf(boxes: readonly FlowBox[]): FlowBox {
  let left = Number.POSITIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY

  for (const box of boxes) {
    left = Math.min(left, box.left)
    top = Math.min(top, box.top)
    right = Math.max(right, box.left + box.width)
    bottom = Math.max(bottom, box.top + box.height)
  }

  return { left, top, width: right - left, height: bottom - top }
}

export function useFlowGroup(): FlowGroup | null {
  const direct = useDirectControls()
  const root = useCanvasRoot()
  const store = useEditorStoreApi()
  const host = useCanvasHost()
  const selectedIds = useEditorSelector((state) =>
    state.selectedIds.length > 1 && state.editingTextId === null ? state.selectedIds : EMPTY_IDS,
  )
  const locks = useEditorSelector((state) => state.locked)
  const [resolved, setResolved] = useState<Resolved | null>(null)
  const enabled = direct && root !== null && selectedIds.length > 1

  useEffect(() => {
    if (!enabled || !root) return

    let frame = 0
    let latest: Resolved | null = null

    const run = () => {
      frame = 0
      const elements: HTMLElement[] = []
      for (const id of selectedIds) {
        const element = root.querySelector<HTMLElement>(`[data-adt-id="${id}"]`)
        if (element) elements.push(element)
      }
      if (elements.length < 2) {
        latest = null
        setResolved(null)
        return
      }

      const { doc, locked } = store.state
      const next = inspectGroup(elements, {
        isLocked: (element) => {
          const id = idOf(element)
          return id !== null && isLockedAnywhere(doc, locked, id)
        },
      })
      if (latest && sameResolution(latest, next)) return
      latest = next
      setResolved(next)
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run)
    }

    const mutations = new MutationObserver(schedule)
    mutations.observe(root, { attributes: true, childList: true, subtree: true, characterData: true })
    const resize = new ResizeObserver(schedule)
    resize.observe(root)
    run()

    return () => {
      cancelAnimationFrame(frame)
      mutations.disconnect()
      resize.disconnect()
    }
  }, [enabled, root, store, selectedIds, locks])

  if (!enabled || !resolved || resolved.members.length < 2) return null

  const { members, parent, can } = resolved
  const ids: NodeId[] = []
  for (const member of members) {
    const id = idOf(member)
    if (id) ids.push(id)
  }
  if (ids.length !== members.length) return null

  return {
    ids,
    members,
    parent,
    parentId: parent ? idOf(parent) : null,
    can,
    host,
    measure: () => {
      const hostElement = host.host()
      if (!hostElement || members.some((member) => !member.isConnected)) return null
      const hostRect = hostElement.getBoundingClientRect()
      const boxes = members.map((member) => boxOf(member, hostRect))
      return {
        box: unionOf(boxes),
        boxes,
        parentBox: parent ? boxOf(parent, hostRect) : null,
        contentWidth: parent ? contentWidthOf(parent) : 0,
        hostLeft: hostRect.left,
        hostTop: hostRect.top,
        hostWidth: hostRect.width,
        hostHeight: hostRect.height,
        scale: host.scale(),
      }
    },
  }
}
