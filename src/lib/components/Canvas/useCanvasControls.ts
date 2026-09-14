import { DEFAULT_WIDTH_PRESETS, useCanvasContext, type CanvasWidthPreset } from './context'

export type WidthPresets = {
  presets: CanvasWidthPreset[]
  activeId: string
  isActive: (id: string) => boolean
  select: (id: string) => void
}

export function useWidthPresets(presets: CanvasWidthPreset[] = DEFAULT_WIDTH_PRESETS): WidthPresets {
  const { presetId, setPreset } = useCanvasContext()
  return {
    presets,
    activeId: presetId,
    isActive: (id) => id === presetId,
    select: (id) => {
      const preset = presets.find((entry) => entry.id === id)
      if (preset) setPreset(preset)
    },
  }
}

export type DarkToggle = {
  isDark: boolean
  setIsDark: (dark: boolean) => void
  toggle: () => void
}

export function useDarkToggle(): DarkToggle {
  const { isDark, setIsDark } = useCanvasContext()
  return { isDark, setIsDark, toggle: () => setIsDark(!isDark) }
}
