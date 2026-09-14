import { createContext, useContext } from 'react'
import invariant from 'tiny-invariant'

export type CanvasWidthPreset = {
  id: string
  label: string
  width: number
}

export const DEFAULT_WIDTH_PRESETS: CanvasWidthPreset[] = [
  { id: 'mobile', label: 'Mobile', width: 390 },
  { id: 'tablet', label: 'Tablet', width: 820 },
  { id: 'desktop', label: 'Desktop', width: 0 },
]

export type CanvasContextValue = {
  width: number
  presetId: string
  setPreset: (preset: CanvasWidthPreset) => void
  isDark: boolean
  setIsDark: (dark: boolean) => void
  /** `false` while the CSS for the current document has not been generated yet. */
  stylesReady: boolean
}

export const CanvasContext = createContext<CanvasContextValue | null>(null)

export function useCanvasContext(): CanvasContextValue {
  const value = useContext(CanvasContext)
  invariant(value, '<HtmlEditor.Canvas> parts must be rendered inside <HtmlEditor.Canvas>')
  return value
}
