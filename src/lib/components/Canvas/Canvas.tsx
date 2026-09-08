import { useState, type ReactNode } from 'react'
import { useCanvasStylesheet } from '../../tailwind/useCanvasStylesheet'
import { HistoryGroup } from '../Editor/HistoryParts'
import {
  CanvasContext,
  DEFAULT_WIDTH_PRESETS,
  type CanvasContextValue,
  type CanvasWidthPreset,
} from './context'
import { CanvasDarkToggle, CanvasToolbar, CanvasViewport, CanvasWidthPresets } from './CanvasParts'
import styles from './Canvas.module.css'

export type CanvasProps = {
  className?: string
  children?: ReactNode
}

export function Canvas({ className, children }: CanvasProps) {
  const [preset, setPreset] = useState<CanvasWidthPreset>(
    DEFAULT_WIDTH_PRESETS[DEFAULT_WIDTH_PRESETS.length - 1],
  )
  const [isDark, setIsDark] = useState(false)

  useCanvasStylesheet()

  const context: CanvasContextValue = {
    width: preset.width,
    presetId: preset.id,
    setPreset,
    isDark,
    setIsDark,
  }

  return (
    <CanvasContext.Provider value={context}>
      <div className={className ? `${styles.wrapper} ${className}` : styles.wrapper}>
        {children ?? <DefaultCanvas />}
      </div>
    </CanvasContext.Provider>
  )
}

function DefaultCanvas() {
  return (
    <>
      <CanvasToolbar>
        <HistoryGroup />
        <CanvasWidthPresets />
        <CanvasDarkToggle />
      </CanvasToolbar>
      <CanvasViewport />
    </>
  )
}
