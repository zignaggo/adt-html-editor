import type { KeyboardEvent } from 'react'
import { useEditorStoreApi } from '../Editor/context'
import { useLayersContext } from './context'

export type LayersSearch = {
  value: string
  isSearching: boolean
  matchCount: number
  setValue: (value: string) => void
  clear: () => void
  registerInput: (element: HTMLInputElement | null) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function useLayersSearch(): LayersSearch {
  const { rows, state, actions, meta } = useLayersContext()
  const store = useEditorStoreApi()

  return {
    value: state.query,
    isSearching: state.isSearching,
    matchCount: state.matchCount,
    setValue: actions.setQuery,
    clear: actions.clearSearch,
    registerInput: meta.registerSearch,
    onKeyDown(event) {
      if (event.key === 'Escape') {
        if (!state.query) return
        event.preventDefault()
        actions.clearSearch()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'Enter') return
      if (rows.length === 0) return
      event.preventDefault()
      const { selectedId } = store.state
      if (!selectedId || !rows.some((row) => row.id === selectedId)) {
        const target = rows.find((row) => row.isMatch) ?? rows[0]
        store.actions.select(target.id)
      }
      actions.focusTree()
    },
  }
}
