import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import { isEditorDrag, surfaceTarget } from '../../dnd/data'
import { DropIndicator } from '../../dnd/DropIndicator'
import { useChildren, useEditorContext, useRootId } from '../Editor/context'
import { CanvasNode } from './CanvasNode'
import { CanvasStage, CanvasStageContent } from './CanvasStage'
import { STAGE_PADDING, useCanvasStage } from './stage'
import { useCanvasContext, type CanvasWidthPreset } from './context'
import { SelectionOverlay } from './SelectionOverlay'
import { useCanvasInteractions } from './useCanvasInteractions'
import { useDarkToggle, useWidthPresets } from './useCanvasControls'
import { cn } from 'cn'
import { CANVAS_CLASS } from '../../styles/canvasStyles'
import { PRESET_BUTTON_CLASS, PRESET_GROUP_CLASS } from './canvasStyles'

export function CanvasToolbar({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border bg-background px-3 py-1.5">
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

export function CanvasViewport({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement | null>(null)

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
        <CanvasPage />
      </CanvasStageContent>

      <SelectionOverlay />
      <DropIndicator surface="canvas" />
    </CanvasStage>
  )
}

function CanvasPage() {
  const { canvasRootRef } = useEditorContext()
  const { width, isDark, stylesReady } = useCanvasContext()
  const stage = useCanvasStage()
  const rootId = useRootId()
  const children = useChildren(rootId)
  const interactions = useCanvasInteractions()

  return (
    <div className="box-border flex w-full justify-center p-4">
      <div
        className="overflow-clip rounded-lg bg-white shadow-lg transition-[width] duration-200 ease-out"
        style={{
          width: width ? `${width}px` : '100%',
          minHeight: stage.height ? `${stage.height - STAGE_PADDING * 2}px` : undefined,
        }}
      >
        <div
          ref={canvasRootRef as RefObject<HTMLDivElement>}
          role="group"
          aria-label="Editable preview"
          tabIndex={0}
          className={cn(CANVAS_CLASS, isDark && 'adt-dark')}
          data-adt-canvas=""
          data-adt-styles={stylesReady ? 'ready' : 'pending'}
          aria-busy={!stylesReady || undefined}
          onPointerMove={interactions.onPointerMove}
          onPointerLeave={interactions.onPointerLeave}
          onMouseDown={interactions.onMouseDown}
          onClick={interactions.onClick}
          onDoubleClick={interactions.onDoubleClick}
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
      </div>
    </div>
  )
}
