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
  /** `false` enquanto o CSS do documento atual ainda não foi gerado. */
  stylesReady: boolean
}

export const CanvasContext = createContext<CanvasContextValue | null>(null)

export function useCanvasContext(): CanvasContextValue {
  const value = useContext(CanvasContext)
  invariant(value, 'As partes de <HtmlEditor.Canvas> precisam ficar dentro de <HtmlEditor.Canvas>')
  return value
}
