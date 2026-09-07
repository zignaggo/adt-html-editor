import { createContext, useContext } from 'react'
import invariant from 'tiny-invariant'
import type { LayerRowInfo } from './flatten'

export type LayersContextValue = {
  rows: LayerRowInfo[]
}

export const LayersContext = createContext<LayersContextValue | null>(null)

export function useLayersContext(): LayersContextValue {
  const value = useContext(LayersContext)
  invariant(value, 'As partes de <HtmlEditor.Layers> precisam ficar dentro de <HtmlEditor.Layers>')
  return value
}
