import { useDeferredValue, useRef, useState, type ReactNode } from 'react'
import { useEditorSelector } from '../Editor/context'
import { LayersContext, type LayersContextValue } from './context'
import { createLayerFilter, flattenTree } from './flatten'
import { LayersCount, LayersHeader, LayersSearch, LayersTitle, LayersTree } from './LayersParts'
import styles from './LayersPanel.module.css'

export function LayersProvider({ children }: { children: ReactNode }) {
  const doc = useEditorSelector((state) => state.doc)
  const collapsed = useEditorSelector((state) => state.collapsed)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const treeRef = useRef<HTMLElement | null>(null)

  const filter = createLayerFilter(deferredQuery)
  const rows = flattenTree(doc, collapsed, filter ?? undefined)
  const matchCount = filter ? rows.reduce((total, row) => total + (row.isMatch ? 1 : 0), 0) : rows.length

  const context: LayersContextValue = {
    rows,
    state: { query, isSearching: filter !== null, matchCount },
    actions: {
      setQuery,
      clearSearch: () => setQuery(''),
      focusTree: () => treeRef.current?.focus(),
      focusSearch: () => searchRef.current?.focus(),
    },
    meta: {
      registerSearch: (element) => {
        searchRef.current = element
      },
      registerTree: (element) => {
        treeRef.current = element
      },
    },
  }

  return <LayersContext value={context}>{children}</LayersContext>
}

export type LayersPanelProps = {
  className?: string
  children?: ReactNode
}

export function LayersPanel({ className, children }: LayersPanelProps) {
  return (
    <LayersProvider>
      <div className={className ? `${styles.panel} ${className}` : styles.panel}>
        {children ?? <DefaultLayers />}
      </div>
    </LayersProvider>
  )
}

function DefaultLayers() {
  return (
    <>
      <LayersHeader>
        <LayersTitle>Layers</LayersTitle>
        <LayersCount />
      </LayersHeader>
      <LayersSearch />
      <LayersTree />
    </>
  )
}
