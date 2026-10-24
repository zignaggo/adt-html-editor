import { useCanvasContext, type CanvasMode, type CanvasWidthPreset } from './context'

export type WidthPresets = {
  presets: CanvasWidthPreset[]
  activeId: string
  isActive: (id: string) => boolean
  select: (id: string) => void
}

export function useWidthPresets(presets?: CanvasWidthPreset[]): WidthPresets {
  const { presetId, setPreset, presets: fromContext } = useCanvasContext()
  const list = presets ?? fromContext
  return {
    presets: list,
    activeId: presetId,
    isActive: (id) => id === presetId,
    select: (id) => {
      const preset = list.find((entry) => entry.id === id)
      if (preset) setPreset(preset)
    },
  }
}

export type CanvasModeControl = {
  mode: CanvasMode
  isActive: (mode: CanvasMode) => boolean
  select: (mode: CanvasMode) => void
  toggle: () => void
}

export function useCanvasMode(): CanvasModeControl {
  const { mode, setMode } = useCanvasContext()
  return {
    mode,
    isActive: (candidate) => candidate === mode,
    select: setMode,
    toggle: () => setMode(mode === 'frames' ? 'single' : 'frames'),
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
