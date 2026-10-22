import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useCanvasStylesheet } from '../../tailwind/useCanvasStylesheet'
import type { GhostStrategy } from '../../fixed/ghost/strategy'
import { LiveGhost } from '../../fixed/ghost/LiveGhost'
import { Guides } from '../../fixed/guides/Guides'
import { Handles } from '../../fixed/transform/Handles'
import { Zoom } from '../../fixed/Zoom'
import type { FixedPageProps } from '../../fixed/FixedPage'
import { useEditorContext, useLayoutMode } from '../Editor/context'
import { breakpointForWidth } from '../../tailwind/variants'
import { HistoryGroup } from '../Editor/HistoryParts'
import {
  CanvasContext,
  DEFAULT_WIDTH_PRESETS,
  type CanvasContextValue,
  type CanvasMode,
  type CanvasWidthPreset,
  type CanvasZoom,
} from './context'
import { framesWidth, resolveFrames, type CanvasFrame } from './frames'
import {
  CanvasDarkToggle,
  CanvasModeToggle,
  CanvasToolbar,
  CanvasViewport,
  CanvasWidthPresets,
} from './CanvasParts'
import { cn } from 'cn'

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

export type CanvasProviderProps = {
  children: ReactNode
  presets?: CanvasWidthPreset[]
  defaultMode?: CanvasMode
}

export function CanvasProvider({
  children,
  presets = DEFAULT_WIDTH_PRESETS,
  defaultMode = 'single',
}: CanvasProviderProps) {
  const [preset, setPreset] = useState<CanvasWidthPreset>(presets[0] ?? DEFAULT_WIDTH_PRESETS[0])
  const [mode, setMode] = useState<CanvasMode>(defaultMode)
  const [isDark, setIsDark] = useState(false)
  const [zoom, setZoom] = useState<CanvasZoom>('fit')
  const ghostRef = useRef<GhostStrategy | null>(null)
  const ghostLayerRef = useRef<HTMLElement | null>(null)

  const stylesReady = useCanvasStylesheet()
  const { breakpoint } = useEditorContext()
  useEffect(() => {
    breakpoint.setState(() => breakpointForWidth(preset.width))
    return () => breakpoint.setState(() => 'desktop')
  }, [breakpoint, preset.width])

  const registerGhost = (strategy: GhostStrategy) => {
    ghostRef.current = strategy
    return () => {
      if (ghostRef.current === strategy) ghostRef.current = null
    }
  }

  const registerGhostLayer = (element: HTMLElement | null) => {
    ghostLayerRef.current = element
  }

  const frames = mode === 'frames' ? resolveFrames(presets) : EMPTY_FRAMES

  const context: CanvasContextValue = {
    width: preset.width,
    presetId: preset.id,
    setPreset,
    presets,
    mode,
    setMode,
    frames,
    fitWidth: mode === 'frames' ? framesWidth(frames) : preset.width,
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

  return <CanvasContext value={context}>{children}</CanvasContext>
}

const EMPTY_FRAMES: CanvasFrame[] = []

export type CanvasProps = {
  className?: string
  children?: ReactNode
  presets?: CanvasWidthPreset[]
  defaultMode?: CanvasMode
}

export function Canvas({ className, children, presets, defaultMode }: CanvasProps) {
  return (
    <CanvasProvider presets={presets} defaultMode={defaultMode}>
      <div className={cn('flex min-h-0 min-w-0 flex-col bg-muted', className)}>
        {children ?? <DefaultCanvas />}
      </div>
    </CanvasProvider>
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
          <Handles />
        </CanvasFixedPage>
      </>
    )
  }

  return (
    <>
      <CanvasToolbar>
        <HistoryGroup />
        <CanvasModeToggle />
        <CanvasWidthPresets />
        <Zoom />
        <CanvasDarkToggle />
      </CanvasToolbar>
      <CanvasViewport />
    </>
  )
}
