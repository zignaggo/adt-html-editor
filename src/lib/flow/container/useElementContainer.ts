import { useEditor, useEditorSelector, useEditorStoreApi } from '../../components/Editor/context'
import type { NodeId } from '../../core/ids'
import { isStyled } from '../../core/model'
import { isImage } from '../component/componentLayout'
import type { FlowTarget } from '../useFlowSelection'
import {
  canWrapInContainer,
  containerAttributes,
  containerMessageOf,
  CONTAINER_TAG,
  planContainer,
  slotOf,
  type ContainerBlock,
  type ContainerMessage,
  type ContainerSlot,
} from './elementContainer'

export type ElementContainer = {
  blocked: ContainerBlock | null
  slot: ContainerSlot | null
  image: boolean
  message: ContainerMessage
  wrap: () => boolean
  selectParent: () => void
}

function idOf(element: HTMLElement): NodeId | null {
  return (element.getAttribute('data-adt-id') as NodeId | null) ?? null
}

export function useElementContainer(target: FlowTarget | null): ElementContainer | null {
  const store = useEditorStoreApi()
  const actions = useEditor()
  const doc = useEditorSelector((state) => state.doc)
  const locked = useEditorSelector((state) => state.locked)

  if (!target) return null

  const element = target.element
  const entry = canWrapInContainer(element, undefined, { doc, locked, id: target.id })
  const blocked = entry === true ? null : entry
  const slot = slotOf(element)
  const image = isImage(element)

  const parentIdOf = (): NodeId | null => {
    const parent = element.parentElement
    return parent ? idOf(parent) : null
  }

  const wrap = (): boolean => {
    const live = store.state
    const recheck = canWrapInContainer(element, undefined, {
      doc: live.doc,
      locked: live.locked,
      id: target.id,
    })
    if (recheck !== true) return false

    const parentId = parentIdOf()
    if (!parentId) return false
    const parentNode = live.doc.nodes[parentId]
    if (!parentNode || parentNode.kind !== 'element') return false
    const index = parentNode.children.indexOf(target.id)
    if (index < 0) return false

    const node = live.doc.nodes[target.id]
    const plan = planContainer(element, node && isStyled(node) ? node.classes : [])

    return actions.transaction(
      () => {
        const wrapperId = actions.insertNode(
          {
            tag: CONTAINER_TAG,
            attrs: containerAttributes(plan),
            classes: [...plan.wrapper.classes],
          },
          { parentId, index },
        )
        if (!wrapperId) {
          actions.select(target.id)
          return false
        }

        if (!actions.moveNode(target.id, { parentId: wrapperId, index: 0 })) {
          actions.removeNode(wrapperId)
          actions.select(target.id)
          return false
        }

        if (plan.childClasses) actions.setClasses(target.id, plan.childClasses)
        actions.select(target.id)
        return true
      },
      { coalesceKey: `container:${target.id}` },
    )
  }

  return {
    blocked,
    slot,
    image,
    message: containerMessageOf({ blocked, image, slot }),
    wrap,
    selectParent: () => {
      const parentId = parentIdOf()
      if (parentId) actions.select(parentId)
    },
  }
}
