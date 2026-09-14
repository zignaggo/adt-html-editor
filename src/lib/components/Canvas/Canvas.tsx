import { lazy, Suspense, useRef, useState, type ReactNode } from 'react'
import { useCanvasStylesheet } from '../../tailwind/useCanvasStylesheet'
import type { GhostStrategy } from '../../fixed/ghost/strategy'
import { LiveGhost } from '../../fixed/ghost/LiveGhost'
import { Guides } from '../../fixed/guides/Guides'
import { Zoom } from '../../fixed/Zoom'
import type { FixedPageProps } from '../../fixed/FixedPage'
import { useLayoutMode } from '../Editor/context'
import { HistoryGroup } from '../Editor/HistoryParts'
import {
  CanvasContext,
  DEFAULT_WIDTH_PRESETS,
  type CanvasContextValue,
  type CanvasWidthPreset,
  type CanvasZoom,
} from './context'
import { CanvasDarkToggle, CanvasToolbar, CanvasViewport, CanvasWidthPresets } from './CanvasParts'
import styles from './Canvas.module.css'

const LazyFixedPage = lazy(() =>
  import('../../fixed/FixedPage').then((module) => ({ default: module.FixedPage })),
)

export function CanvasFixedPage(props: FixedPageProps) {
  return (
    <Suspense fallback={null}>
      <LazyFixedPage {...props} />
    </Suspense>
  )
}

export type CanvasProps = {
  className?: string
  children?: ReactNode
}

export function Canvas({ className, children }: CanvasProps) {
  const [preset, setPreset] = useState<CanvasWidthPreset>(
    DEFAULT_WIDTH_PRESETS[DEFAULT_WIDTH_PRESETS.length - 1],
  )
  const [isDark, setIsDark] = useState(false)
  const [zoom, setZoom] = useState<CanvasZoom>('fit')
  const ghostRef = useRef<GhostStrategy | null>(null)
  const ghostLayerRef = useRef<HTMLElement | null>(null)

  const stylesReady = useCanvasStylesheet()

  const registerGhost = (strategy: GhostStrategy) => {
    ghostRef.current = strategy
    return () => {
      if (ghostRef.current === strategy) ghostRef.current = null
    }
  }

  const registerGhostLayer = (element: HTMLElement | null) => {
    ghostLayerRef.current = element
  }

  const context: CanvasContextValue = {
    width: preset.width,
    presetId: preset.id,
    setPreset,
    isDark,
    setIsDark,
    stylesReady,
    zoom,
    setZoom,
    ghostRef,
    registerGhost,
    ghostLayerRef,
    registerGhostLayer,
  }

  return (
    <CanvasContext value={context}>
      <div className={className ? `${styles.wrapper} ${className}` : styles.wrapper}>
        {children ?? <DefaultCanvas />}
      </div>
    </CanvasContext>
  )
}

function DefaultCanvas() {
  const layout = useLayoutMode()

  if (layout === 'fixed') {
    return (
      <>
        <CanvasToolbar>
          <HistoryGroup />
          <Zoom />
          <CanvasDarkToggle />
        </CanvasToolbar>
        <CanvasFixedPage>
          <Guides />
          <LiveGhost />
        </CanvasFixedPage>
      </>
    )
  }

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
