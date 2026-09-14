import { createContext, use } from 'react'
import { useSelector } from '@tanstack/react-store'
import invariant from 'tiny-invariant'
import type { NodeId } from '../../core/ids'
import type { AnyNode, EditorDocument } from '../../core/model'
import type { EditorActions, EditorState, EditorStore } from '../../core/store'

export type StyleMode = 'tailwind' | 'inline-css'

export type EditorContextValue = {
  store: EditorStore
  styleMode: StyleMode
  canvasRootRef: { current: HTMLElement | null }
}

export const EditorContext = createContext<EditorContextValue | null>(null)

export function useEditorContext(): EditorContextValue {
  const value = use(EditorContext)
  invariant(value, '<HtmlEditor> missing: panels must be rendered inside the provider')
  return value
}

export function useEditorStoreApi(): EditorStore {
  return useEditorContext().store
}

export function useEditorSelector<T>(selector: (state: EditorState) => T): T {
  return useSelector(useEditorContext().store, selector)
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

/** Editor actions. The object is stable per instance — safe to use in hook deps. */
export function useEditor(): EditorApi {
  return useEditorStoreApi().actions
}

export type EditorApi = EditorActions
