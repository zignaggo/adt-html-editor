import type { ReactNode } from 'react'
import { useEditorSelector } from '../Editor/context'
import { LayersContext, type LayersContextValue } from './context'
import { flattenTree } from './flatten'
import { LayersCount, LayersHeader, LayersTitle, LayersTree } from './LayersParts'
import styles from './LayersPanel.module.css'

export type LayersPanelProps = {
  className?: string
  children?: ReactNode
}

export function LayersPanel({ className, children }: LayersPanelProps) {
  const doc = useEditorSelector((state) => state.doc)
  const collapsed = useEditorSelector((state) => state.collapsed)

  const context: LayersContextValue = { rows: flattenTree(doc, collapsed) }

  return (
    <LayersContext.Provider value={context}>
      <div className={className ? `${styles.panel} ${className}` : styles.panel}>
        {children ?? <DefaultLayers />}
      </div>
    </LayersContext.Provider>
  )
}

function DefaultLayers() {
  return (
    <>
      <LayersHeader>
        <LayersTitle>Layers</LayersTitle>
        <LayersCount />
      </LayersHeader>
      <LayersTree />
    </>
  )
}
