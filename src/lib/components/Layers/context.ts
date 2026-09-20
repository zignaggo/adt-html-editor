import { createContext, use } from 'react'
import invariant from 'tiny-invariant'
import type { NodeId } from '../../core/ids'
import type { LayerRowInfo } from './flatten'

export type LayersState = {
  query: string
  isSearching: boolean
  matchCount: number
}

export type LayersActions = {
  setQuery: (query: string) => void
  clearSearch: () => void
  focusTree: () => void
  focusSearch: () => void
  selectRange: (id: NodeId) => void
}

export type LayersMeta = {
  registerSearch: (element: HTMLInputElement | null) => void
  registerTree: (element: HTMLElement | null) => void
}

export type LayersContextValue = {
  rows: LayerRowInfo[]
  state: LayersState
  actions: LayersActions
  meta: LayersMeta
}

export const LayersContext = createContext<LayersContextValue | null>(null)

export function useLayersContext(): LayersContextValue {
  const value = use(LayersContext)
  invariant(value, '<HtmlEditor.Layers> parts must be rendered inside <HtmlEditor.Layers>')
  return value
}
