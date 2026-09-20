import { createContext, use } from 'react'
import { useSelector } from '@tanstack/react-store'
import type { Store } from '@tanstack/store'
import invariant from 'tiny-invariant'
import type { NodeId } from '../../core/ids'
import type { AnyNode, EditorDocument } from '../../core/model'
import type { EditorActions, EditorState, EditorStore } from '../../core/store'
import type { BreakpointId } from '../../tailwind/variants'

export type StyleMode = 'tailwind' | 'inline-css'

export type LayoutMode = 'flow' | 'fixed'

export type FixedLayoutConfig = {
  page: { width: number; height: number }
  pageContainerId: NodeId
  precision: number
  snapThreshold: number
  keepStacking: boolean
  resolveAsset?: (url: string) => string
}

export type EditorContextValue = {
  store: EditorStore
  styleMode: StyleMode
  layout: LayoutMode
  fixedLayout: FixedLayoutConfig
  aspectLock: Store<boolean>
  breakpoint: Store<BreakpointId>
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

export type EditorSelectorOptions<T> = { compare?: (a: T, b: T) => boolean }

export function useEditorSelector<T>(
  selector: (state: EditorState) => T,
  options?: EditorSelectorOptions<T>,
): T {
  return useSelector(useEditorContext().store, selector, options)
}

export const selectSelectedId = (state: EditorState) => state.selectedId
export const selectSelectedIds = (state: EditorState) => state.selectedIds

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

export function useSelectedId(): NodeId | null {
  return useEditorSelector(selectSelectedId)
}

export function useSelectedIds(): readonly NodeId[] {
  return useEditorSelector(selectSelectedIds)
}

export function useSelectionCount(): number {
  return useEditorSelector((state) => state.selectedIds.length)
}

export function useIsSelected(id: NodeId): boolean {
  return useEditorSelector((state) => state.selectedIds.includes(id))
}

export function useIsAnchor(id: NodeId): boolean {
  return useEditorSelector((state) => state.selectedId === id)
}

export function useIsCollapsed(id: NodeId): boolean {
  return useEditorSelector((state) => Boolean(state.collapsed[id]))
}

export function useIsLocked(id: NodeId): boolean {
  return useEditorSelector((state) => Boolean(state.locked[id]))
}

export function useLayoutMode(): LayoutMode {
  return useEditorContext().layout
}

export function useFixedLayout(): FixedLayoutConfig {
  return useEditorContext().fixedLayout
}

export function useAspectLocked(): boolean {
  return useSelector(useEditorContext().aspectLock, (locked) => locked)
}

export function useBreakpoint(): BreakpointId {
  return useSelector(useEditorContext().breakpoint, (breakpoint) => breakpoint)
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
