import type { ReactNode } from 'react'
import { LayoutGridIcon, MonitorIcon, MoonIcon } from 'lucide-react'
import { CanvasFixedPage, CanvasProvider } from '../../../lib/components/Canvas/Canvas'
import { CanvasViewport } from '../../../lib/components/Canvas/CanvasParts'
import type { CanvasMode, CanvasWidthPreset } from '../../../lib/components/Canvas/context'
import {
  useCanvasMode,
  useDarkToggle,
  useWidthPresets,
} from '../../../lib/components/Canvas/useCanvasControls'
import { useLayoutMode } from '../../../lib/components/Editor/context'
import { LiveGhost } from '../../../lib/fixed/ghost/LiveGhost'
import { Guides } from '../../../lib/fixed/guides/Guides'
import { Handles } from '../../../lib/fixed/transform/Handles'
import { useZoom } from '../../../lib/fixed/useZoom'
import type { CanvasZoomLevel } from '../../../lib/fixed/zoomLevels'
import { cn } from '../../lib/utils'
import { Separator } from '../../ui/separator'
import { Toggle } from '../../ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '../../ui/toggle-group'

export type CanvasProps = {
  className?: string
  children?: ReactNode
  presets?: CanvasWidthPreset[]
  defaultMode?: CanvasMode
}

export function Canvas({ className, children, presets, defaultMode }: CanvasProps) {
  return (
    <CanvasProvider presets={presets} defaultMode={defaultMode}>
      <div
        className={cn(
          'relative flex min-h-0 min-w-0 flex-col bg-muted/40 text-foreground',
          className,
        )}
      >
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
        <CanvasFixedPage>
          <Guides />
          <LiveGhost />
          <Handles />
        </CanvasFixedPage>
        <CanvasDock>
          <CanvasZoom />
          <DockSeparator />
          <CanvasDarkToggle />
        </CanvasDock>
      </>
    )
  }

  return (
    <>
      <CanvasViewport />
      <CanvasDock>
        <CanvasModeToggle />
        <DockSeparator />
        <CanvasWidthPresets />
        <DockSeparator />
        <CanvasZoom />
        <DockSeparator />
        <CanvasDarkToggle />
      </CanvasDock>
    </>
  )
}

export function CanvasDock({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4',
        className,
      )}
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border bg-popover/95 p-1 text-popover-foreground shadow-lg backdrop-blur">
        {children}
      </div>
    </div>
  )
}

function DockSeparator() {
  return <Separator orientation="vertical" className="mx-0.5 my-1" />
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

const MODE_ITEMS: { id: CanvasMode; label: string; Icon: typeof MonitorIcon }[] = [
  { id: 'single', label: 'Single page', Icon: MonitorIcon },
  { id: 'frames', label: 'All breakpoints', Icon: LayoutGridIcon },
]

export function CanvasModeToggle() {
  const control = useCanvasMode()
  return (
    <ToggleGroup
      value={[control.mode]}
      onValueChange={(value) =>
        control.select(singleValue(value as string[], control.mode) as CanvasMode)
      }
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Canvas mode"
    >
      {MODE_ITEMS.map(({ id, label, Icon }) => (
        <ToggleGroupItem key={id} value={id} aria-label={label} title={label}>
          <Icon />
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
