import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import invariant from 'tiny-invariant'
import type { NodeId } from '../../core/ids'
import type { AnyNode, EditorDocument } from '../../core/model'
import type { EditorStore, EditorStoreState } from '../../core/store'

export type StyleMode = 'tailwind' | 'inline-css'

export type EditorContextValue = {
  store: EditorStore
  styleMode: StyleMode
  canvasRootRef: { current: HTMLElement | null }
}

export const EditorContext = createContext<EditorContextValue | null>(null)

export function useEditorContext(): EditorContextValue {
  const value = useContext(EditorContext)
  invariant(value, '<HtmlEditor> ausente: os painéis precisam ficar dentro do provider')
  return value
}

export function useEditorStoreApi(): EditorStore {
  return useEditorContext().store
}

export function useEditorSelector<T>(selector: (state: EditorStoreState) => T): T {
  return useStore(useEditorContext().store, selector)
}

const EMPTY_CHILDREN: NodeId[] = []

export function useNode(id: NodeId): AnyNode | undefined {
  return useEditorSelector((state) => state.doc.nodes[id])
}

export function useChildren(id: NodeId): NodeId[] {
  return useEditorSelector((state) => {
    const node = state.doc.nodes[id]
    return node && node.kind === 'element' ? node.children : EMPTY_CHILDREN
  })
}

export function useIsSelected(id: NodeId): boolean {
  return useEditorSelector((state) => state.selectedId === id)
}

export function useIsCollapsed(id: NodeId): boolean {
  return useEditorSelector((state) => Boolean(state.collapsed[id]))
}

export function useCanUndo(): boolean {
  return useEditorSelector((state) => state.history.past.length > 0)
}

export function useCanRedo(): boolean {
  return useEditorSelector((state) => state.history.future.length > 0)
}

export function useRootId(): NodeId {
  return useEditorSelector((state) => state.doc.rootId)
}

export function useDocument(): EditorDocument {
  return useEditorSelector((state) => state.doc)
}

const actionsByStore = new WeakMap<EditorStore, EditorApi>()

export function useEditor(): EditorApi {
  const store = useEditorStoreApi()
  const cached = actionsByStore.get(store)
  if (cached) return cached
  const api = selectActions(store.getState())
  actionsByStore.set(store, api)
  return api
}

export type EditorApi = ReturnType<typeof selectActions>

function selectActions(state: EditorStoreState) {
  return {
    insertNode: state.insertNode,
    insertHtml: state.insertHtml,
    moveNode: state.moveNode,
    removeNode: state.removeNode,
    duplicateNode: state.duplicateNode,
    setClasses: state.setClasses,
    setAttr: state.setAttr,
    setText: state.setText,
    select: state.select,
    toggleCollapsed: state.toggleCollapsed,
    setCollapsed: state.setCollapsed,
    beginTextEdit: state.beginTextEdit,
    undo: state.undo,
    redo: state.redo,
    getHtml: state.getHtml,
    replaceDocument: state.replaceDocument,
  }
}
