import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import { childrenOf, labelOf } from '../../core/model'
import { resolveKeyboardMove, type MoveDirection } from '../../core/keyboardMove'
import { useEditorStoreApi } from './context'

export type KeyboardMove = (direction: MoveDirection) => boolean

export function useKeyboardMove(): KeyboardMove {
  const store = useEditorStoreApi()

  return function move(direction) {
    const { state, actions } = store
    const id = state.selectedId
    if (!id) return false
    if (state.selectedIds.length > 1) {
      announce('select a single element to move it')
      return false
    }

    const target = resolveKeyboardMove(state.doc, id, direction)
    if (!target) {
      announce('cannot move in that direction')
      return false
    }

    if (direction === 'in') actions.setCollapsed(target.parentId, false)

    const moved = actions.moveNode(id, target)
    if (!moved) return false

    const next = store.state.doc
    const node = next.nodes[id]
    const name = node ? labelOf(node) : id

    if (direction === 'up' || direction === 'down') {
      const siblings = childrenOf(next, target.parentId)
      announce(`${name} at position ${siblings.indexOf(id) + 1} of ${siblings.length}`)
    } else {
      const parent = next.nodes[target.parentId]
      const where = parent ? labelOf(parent) : 'document'
      announce(direction === 'in' ? `${name} moved into ${where}` : `${name} moved to ${where}`)
    }

    return true
  }
}
