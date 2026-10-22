import { useSelector } from '@tanstack/react-store'
import { copySubtrees, readClipboard } from '../../../core/clipboard'
import { childrenOf, isStyled } from '../../../core/model'
import { useEditor, useEditorSelector, useEditorStoreApi } from '../../Editor/context'
import { closeContextMenu, contextMenu } from './contextMenuStore'
import {
  allLocked,
  menuActionsFor,
  parentTarget,
  type MenuAction,
  type MenuActionId,
  type MenuContext,
} from './menuActions'
import { copyStyle, readStyleClipboard, styleClipboard } from './styleClipboard'

export type ContextMenu = {
  open: boolean
  x: number
  y: number
  actions: MenuAction[]
  run: (id: MenuActionId) => void
  close: () => void
}

export function useContextMenu(): ContextMenu {
  const store = useEditorStoreApi()
  const actions = useEditor()
  const { open, x, y } = useSelector(contextMenu, (state) => state)
  const copied = useSelector(styleClipboard, (state) => state)
  const doc = useEditorSelector((state) => state.doc)
  const selectedIds = useEditorSelector((state) => state.selectedIds)
  const locked = useEditorSelector((state) => state.locked)

  const context: MenuContext = {
    doc,
    selectedIds,
    locked,
    hasClipboard: readClipboard() !== null,
    hasStyle: copied !== null,
  }

  const run = (id: MenuActionId) => {
    closeContextMenu()
    const ids = store.state.selectedIds
    if (ids.length === 0 && id !== 'paste') return

    switch (id) {
      case 'duplicate':
        actions.duplicateNodes(ids)
        return

      case 'delete':
        actions.removeNodes(ids)
        return

      case 'copy':
        copySubtrees(store.state.doc, ids)
        return

      case 'paste': {
        const html = readClipboard()
        if (!html) return
        const anchor = ids[0]
        const parentId = anchor ? store.state.doc.nodes[anchor]?.parentId : null
        if (!parentId || !anchor) return
        const index = childrenOf(store.state.doc, parentId).indexOf(anchor) + 1
        actions.insertHtml(html, { parentId, index })
        return
      }

      case 'copy-style': {
        const node = ids.length === 1 ? store.state.doc.nodes[ids[0]] : undefined
        if (!node || !isStyled(node)) return
        copyStyle({ classes: [...node.classes], style: node.attrs.style ?? null })
        return
      }

      case 'paste-style': {
        const style = readStyleClipboard()
        if (!style) return
        actions.transaction(() => {
          for (const id of ids) {
            const node = store.state.doc.nodes[id]
            if (!node || !isStyled(node)) continue
            actions.setClasses(id, [...style.classes])
            actions.setAttr(id, 'style', style.style)
          }
        }, { coalesceKey: `paste-style:${ids.join(',')}` })
        return
      }

      case 'select-parent': {
        const parentId = parentTarget({ ...context, doc: store.state.doc, selectedIds: ids })
        if (parentId) actions.select(parentId)
        return
      }

      case 'lock':
        actions.setLockedMany(ids, !allLocked({ ...context, selectedIds: ids }))
        return
    }
  }

  return {
    open,
    x,
    y,
    actions: menuActionsFor(context),
    run,
    close: closeContextMenu,
  }
}

export type { MenuAction, MenuActionId }
