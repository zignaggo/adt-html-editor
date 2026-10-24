import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import { isEditorDrag, surfaceTarget } from '../../dnd/data'
import { DropIndicator } from '../../dnd/DropIndicator'
import { useChildren, useDirectControls, useEditorContext, useRootId } from '../Editor/context'
import { CanvasNode } from './CanvasNode'
import { CanvasStage, CanvasStageContent } from './CanvasStage'
import { STAGE_PADDING, useCanvasStage } from './stage'
import { useCanvasContext, type CanvasMode, type CanvasWidthPreset } from './context'
import {
  CanvasFrameActive,
  FRAME_GAP,
  FRAME_MIN_HEIGHT,
  FRAME_ROW_PADDING,
  type CanvasFrame,
} from './frames'
import { subscribeCanvasViewport } from './viewport'
import { SelectionOverlay } from './SelectionOverlay'
import { CanvasContextMenu } from './menu/CanvasContextMenu'
import { useCanvasBackdrop } from './useCanvasBackdrop'
import { useCanvasInteractions } from './useCanvasInteractions'
import { useCanvasMode, useDarkToggle, useWidthPresets } from './useCanvasControls'
import { cn } from 'cn'
import { CANVAS_CLASS } from '../../styles/canvasStyles'
import {
  FRAME_CLASS,
  FRAME_LABEL_CLASS,
  FRAME_PAGE_CLASS,
  FRAME_ROW_CLASS,
  PAGE_CLASS,
  PRESET_BUTTON_CLASS,
  PRESET_GROUP_CLASS,
} from './canvasStyles'

export function CanvasToolbar({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3">
      {children}
    </div>
  )
}

export function CanvasWidthPresets({ presets }: { presets?: CanvasWidthPreset[] }) {
  const control = useWidthPresets(presets)

  return (
    <div className={PRESET_GROUP_CLASS} role="group" aria-label="Canvas width">
      {control.presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={PRESET_BUTTON_CLASS}
          data-active={control.isActive(preset.id) || undefined}
          aria-pressed={control.isActive(preset.id)}
          onClick={() => control.select(preset.id)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}

const MODE_LABELS: Record<CanvasMode, string> = {
  single: 'Single',
  frames: 'Breakpoints',
}

const MODE_IDS: CanvasMode[] = ['single', 'frames']

export function CanvasModeToggle({ labels = MODE_LABELS }: { labels?: Record<CanvasMode, string> }) {
  const control = useCanvasMode()

  return (
    <div className={PRESET_GROUP_CLASS} role="group" aria-label="Canvas mode">
      {MODE_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={PRESET_BUTTON_CLASS}
          data-active={control.isActive(id) || undefined}
          aria-pressed={control.isActive(id)}
          onClick={() => control.select(id)}
        >
          {labels[id]}
        </button>
      ))}
    </div>
  )
}

export function CanvasDarkToggle({ children }: { children?: ReactNode }) {
  const { isDark, toggle } = useDarkToggle()
  return (
    <button
      type="button"
      className={PRESET_BUTTON_CLASS}
      data-active={isDark || undefined}
      aria-pressed={isDark}
      onClick={toggle}
    >
      {children ?? 'Dark'}
    </button>
  )
}

export function CanvasViewport({ className, children }: { className?: string; children?: ReactNode }) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const { mode } = useCanvasContext()

  useCanvasBackdrop(stageRef)

  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    return dropTargetForElements({
      element,
      canDrop: ({ source }) => isEditorDrag(source.data),
      getData: () => surfaceTarget({ surface: 'canvas' }),
    })
  }, [])

  return (
    <CanvasStage ref={stageRef} className={className}>
      <CanvasStageContent>
        {mode === 'frames' ? <CanvasFrames /> : <CanvasPage />}
      </CanvasStageContent>

      <SelectionOverlay />
      <DropIndicator surface="canvas" />
      <CanvasContextMenu />
      {children}
    </CanvasStage>
  )
}

function CanvasPage() {
  const { width, presetId, presets } = useCanvasContext()
  const stage = useCanvasStage()
  const frameRef = useRef<HTMLDivElement | null>(null)
  const preset = presets.find((entry) => entry.id === presetId)

  useFrameLabelScale(frameRef)

  return (
    <div className="box-border flex w-full justify-center p-4">
      <div
        ref={frameRef}
        className="relative min-w-0 transition-[width] duration-200 ease-out"
        style={{ width: width ? `${width}px` : '100%' }}
      >
        {preset ? (
          <span className={FRAME_LABEL_CLASS} style={LABEL_STYLE}>
            <span>{preset.label}</span>
            {width ? <span className="text-xs text-muted-foreground/70">{width}</span> : null}
          </span>
        ) : null}
        <div
          className={PAGE_CLASS}
          style={{
            minHeight: stage.height ? `${stage.height - STAGE_PADDING * 2}px` : undefined,
          }}
        >
          <CanvasRoot active />
        </div>
      </div>
    </div>
  )
}

const ROW_STYLE = { gap: `${FRAME_GAP}px`, padding: `${FRAME_ROW_PADDING}px` }

const LABEL_STYLE = { transform: 'scale(var(--adt-frame-scale, 1))' }

function useFrameLabelScale(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let frame = 0
    const apply = () => {
      frame = 0
      const element = ref.current
      if (!element?.offsetWidth) return
      const scale = element.getBoundingClientRect().width / element.offsetWidth
      element.style.setProperty('--adt-frame-scale', String(scale > 0 ? 1 / scale : 1))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply)
    }
    apply()
    const unsubscribe = subscribeCanvasViewport(schedule)
    return () => {
      cancelAnimationFrame(frame)
      unsubscribe()
    }
  }, [ref])
}

export function CanvasFrames() {
  const { frames, presetId, presets, setPreset } = useCanvasContext()
  const rowRef = useRef<HTMLDivElement | null>(null)

  useFrameLabelScale(rowRef)

  const activeId = frames.some((frame) => frame.id === presetId) ? presetId : frames[0]?.id

  const activate = (id: string) => {
    const preset = presets.find((entry) => entry.id === id)
    if (preset) setPreset(preset)
  }

  return (
    <div ref={rowRef} className={FRAME_ROW_CLASS} style={ROW_STYLE}>
      {frames.map((frame) => (
        <CanvasFrameView
          key={frame.id}
          frame={frame}
          active={frame.id === activeId}
          onActivate={() => activate(frame.id)}
        />
      ))}
    </div>
  )
}

function CanvasFrameView({
  frame,
  active,
  onActivate,
}: {
  frame: CanvasFrame
  active: boolean
  onActivate: () => void
}) {
  return (
    <div
      className={FRAME_CLASS}
      style={{ width: `${frame.width}px` }}
      data-adt-frame={frame.id}
      data-adt-frame-active={active || undefined}
      onPointerDownCapture={active ? undefined : onActivate}
    >
      <button
        type="button"
        className={FRAME_LABEL_CLASS}
        style={LABEL_STYLE}
        data-active={active || undefined}
        aria-pressed={active}
        onClick={onActivate}
      >
        <span>{frame.label}</span>
        <span className="text-xs text-muted-foreground/70">{frame.width}</span>
      </button>
      <div
        className={cn(PAGE_CLASS, FRAME_PAGE_CLASS)}
        data-active={active || undefined}
        style={{ minHeight: `${FRAME_MIN_HEIGHT}px` }}
      >
        <CanvasFrameActive value={active}>
          <CanvasRoot active={active} />
        </CanvasFrameActive>
      </div>
    </div>
  )
}

function CanvasRoot({ active }: { active: boolean }) {
  const { canvasRootRef } = useEditorContext()
  const { isDark, stylesReady } = useCanvasContext()
  const rootId = useRootId()
  const children = useChildren(rootId)
  const interactions = useCanvasInteractions()
  const direct = useDirectControls()

  return (
    <div
      ref={active ? (canvasRootRef as RefObject<HTMLDivElement>) : null}
      role="group"
      aria-label="Editable preview"
      tabIndex={0}
      className={cn(CANVAS_CLASS, isDark && 'adt-dark')}
      data-adt-canvas=""
      data-adt-direct={direct ? '' : undefined}
      data-adt-styles={stylesReady ? 'ready' : 'pending'}
      aria-busy={!stylesReady || undefined}
      onPointerMove={active ? interactions.onPointerMove : undefined}
      onPointerLeave={active ? interactions.onPointerLeave : undefined}
      onMouseDown={interactions.onMouseDown}
      onClick={interactions.onClick}
      onDoubleClick={interactions.onDoubleClick}
      onContextMenu={interactions.onContextMenu}
      onKeyDown={interactions.onKeyDown}
    >
      {children.map((childId) => (
        <CanvasNode key={childId} id={childId} />
      ))}
      {children.length === 0 ? (
        <p className="m-0 p-4 text-center font-sans text-xs text-pretty text-muted-foreground/70">
          Empty canvas. Drag an element from the palette.
        </p>
      ) : null}
    </div>
  )
}
