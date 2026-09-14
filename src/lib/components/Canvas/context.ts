import { createContext, use } from 'react'
import invariant from 'tiny-invariant'
import type { GhostStrategy } from '../../fixed/ghost/strategy'

export type CanvasWidthPreset = {
  id: string
  label: string
  width: number
}

export const DEFAULT_WIDTH_PRESETS: CanvasWidthPreset[] = [
  { id: 'desktop', label: 'Desktop', width: 0 },
  { id: 'tablet', label: 'Tablet', width: 820 },
  { id: 'mobile', label: 'Mobile', width: 390 },
]

export type CanvasZoom = number | 'fit'

export type CanvasContextValue = {
  width: number
  presetId: string
  setPreset: (preset: CanvasWidthPreset) => void
  isDark: boolean
  setIsDark: (dark: boolean) => void
  /** `false` while the CSS for the current document has not been generated yet. */
  stylesReady: boolean
  zoom: CanvasZoom
  setZoom: (zoom: CanvasZoom) => void
  ghostRef: { current: GhostStrategy | null }
  registerGhost: (strategy: GhostStrategy) => () => void
  ghostLayerRef: { current: HTMLElement | null }
  registerGhostLayer: (element: HTMLElement | null) => void
}

export const CanvasContext = createContext<CanvasContextValue | null>(null)

export function useCanvasContext(): CanvasContextValue {
  const value = use(CanvasContext)
  invariant(value, '<HtmlEditor.Canvas> parts must be rendered inside <HtmlEditor.Canvas>')
  return value
}
