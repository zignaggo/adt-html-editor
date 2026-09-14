import type { ReactNode } from 'react'
import { MoonIcon } from 'lucide-react'
import { CanvasFixedPage, CanvasProvider } from '../../../lib/components/Canvas/Canvas'
import { CanvasViewport } from '../../../lib/components/Canvas/CanvasParts'
import type { CanvasWidthPreset } from '../../../lib/components/Canvas/context'
import { useDarkToggle, useWidthPresets } from '../../../lib/components/Canvas/useCanvasControls'
import { useLayoutMode } from '../../../lib/components/Editor/context'
import { LiveGhost } from '../../../lib/fixed/ghost/LiveGhost'
import { Guides } from '../../../lib/fixed/guides/Guides'
import { Handles } from '../../../lib/fixed/transform/Handles'
import { useZoom } from '../../../lib/fixed/useZoom'
import type { CanvasZoomLevel } from '../../../lib/fixed/zoomLevels'
import { cn } from '../../lib/utils'
import { Toggle } from '../../ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '../../ui/toggle-group'
import { HistoryGroup } from '../Editor/HistoryParts'

export type CanvasProps = {
  className?: string
  children?: ReactNode
}

export function Canvas({ className, children }: CanvasProps) {
  return (
    <CanvasProvider>
      <div className={cn('flex min-h-0 min-w-0 flex-col bg-muted/40 text-foreground', className)}>
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
          <CanvasZoom />
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
        <CanvasWidthPresets />
        <CanvasDarkToggle />
      </CanvasToolbar>
      <CanvasViewport />
    </>
  )
}

export function CanvasToolbar({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div
      className={cn(
        'flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

function singleValue(value: string[], fallback: string): string {
  return value[0] ?? fallback
}

export function CanvasWidthPresets({ presets }: { presets?: CanvasWidthPreset[] }) {
  const control = useWidthPresets(presets)
  return (
    <ToggleGroup
      value={[control.activeId]}
      onValueChange={(value) => control.select(singleValue(value as string[], control.activeId))}
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Canvas width"
    >
      {control.presets.map((preset) => (
        <ToggleGroupItem key={preset.id} value={preset.id} aria-label={preset.label}>
          {preset.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function CanvasZoom({ levels }: { levels?: CanvasZoomLevel[] }) {
  const control = useZoom(levels)
  return (
    <ToggleGroup
      value={control.activeId ? [control.activeId] : []}
      onValueChange={(value) => {
        const next = (value as string[])[0]
        if (next) control.selectLevel(next)
      }}
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Zoom"
    >
      {control.levels.map((level) => (
        <ToggleGroupItem key={level.id} value={level.id} aria-label={level.label}>
          {level.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function CanvasDarkToggle({ children }: { children?: ReactNode }) {
  const { isDark, setIsDark } = useDarkToggle()
  return (
    <Toggle
      variant="outline"
      size="sm"
      pressed={isDark}
      onPressedChange={(pressed) => setIsDark(pressed)}
      aria-label="Dark canvas"
    >
      <MoonIcon data-icon="inline-start" />
      {children ?? 'Dark'}
    </Toggle>
  )
}
