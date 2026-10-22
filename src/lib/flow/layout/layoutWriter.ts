import type { NodeId } from '../../core/ids'
import { isStyled } from '../../core/model'
import type { EditorActions, EditorStore } from '../../core/store'
import { BASE_TARGET } from '../../tailwind/variants'
import { fitClasses } from '../component/componentCommit'
import { wrapperOfImage } from '../component/componentLayout'
import { updateLayout, type LayoutEdit } from './layoutOperations'

export type LayoutWriter = {
  idOf: (element: HTMLElement) => NodeId | null
  classesOf: (id: NodeId) => readonly string[]
  styleOf: (id: NodeId) => string | undefined
  write: (id: NodeId, edits: readonly LayoutEdit[]) => void
  fit: (id: NodeId, reference: HTMLElement | null) => void
}

export function idOf(element: HTMLElement): NodeId | null {
  return (element.getAttribute('data-adt-id') as NodeId | null) ?? null
}

export function createLayoutWriter(store: EditorStore, actions: EditorActions): LayoutWriter {
  const classesOf = (id: NodeId): readonly string[] => {
    const node = store.state.doc.nodes[id]
    return node && isStyled(node) ? node.classes : []
  }

  const styleOf = (id: NodeId): string | undefined => {
    const node = store.state.doc.nodes[id]
    return node && isStyled(node) ? node.attrs.style : undefined
  }

  return {
    idOf,
    classesOf,
    styleOf,

    write: (id, edits) => {
      const next = updateLayout({ classes: classesOf(id), style: styleOf(id) }, edits, BASE_TARGET)
      actions.setClasses(id, next.classes)
      if (next.style !== undefined) actions.setAttr(id, 'style', next.style)
    },

    fit: (id, reference) => {
      const stripPadding = reference !== null && wrapperOfImage(reference) !== null
      actions.setClasses(id, fitClasses(classesOf(id), BASE_TARGET, { stripPadding }))
    },
  }
}
