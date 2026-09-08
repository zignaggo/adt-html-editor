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

    const target = resolveKeyboardMove(state.doc, id, direction)
    if (!target) {
      announce('não é possível mover nessa direção')
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
      announce(`${name} na posição ${siblings.indexOf(id) + 1} de ${siblings.length}`)
    } else {
      const parent = next.nodes[target.parentId]
      const where = parent ? labelOf(parent) : 'documento'
      announce(direction === 'in' ? `${name} movido para dentro de ${where}` : `${name} movido para ${where}`)
    }

    return true
  }
}
