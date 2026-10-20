import { useDocument, useEditor, useEditorSelector } from '../../components/Editor/context'
import type { NodeId } from '../../core/ids'
import {
  EDITABLE_TAGS,
  hasRetagOptions,
  inspectRetag,
  isEditableTag,
  type EditableTag,
  type RetagBlock,
} from './retag'

export type RetagOption = {
  tag: EditableTag
  blocked: RetagBlock | null
  current: boolean
}

export type Retag = {
  tag: string | null
  canRetag: boolean
  options: readonly RetagOption[]
  setTag: (tag: string) => boolean
}

export function useRetag(id: NodeId): Retag {
  const doc = useDocument()
  const actions = useEditor()
  const locked = useEditorSelector((state) => state.locked)
  const editingTextId = useEditorSelector((state) => state.editingTextId)

  const inspection = inspectRetag(doc, id, { locked, editingTextId })
  const options: RetagOption[] = EDITABLE_TAGS.map((tag) => {
    const entry = inspection.can[tag]
    return { tag, blocked: entry === true ? null : entry, current: inspection.tag === tag }
  })

  return {
    tag: inspection.tag,
    canRetag: hasRetagOptions(inspection),
    options,
    setTag: (tag) => {
      if (!isEditableTag(tag) || inspection.can[tag] !== true) return false
      return actions.setTag(id, tag)
    },
  }
}
