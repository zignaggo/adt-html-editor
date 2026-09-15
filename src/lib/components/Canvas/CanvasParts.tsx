import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/utils/combine'
import { isEditorDrag, surfaceTarget } from '../../dnd/data'
import { DropIndicator } from '../../dnd/DropIndicator'
import { useChildren, useEditorContext, useRootId } from '../Editor/context'
import { CanvasNode } from './CanvasNode'
import { useCanvasContext, type CanvasWidthPreset } from './context'
import { SelectionOverlay } from './SelectionOverlay'
import { useCanvasInteractions } from './useCanvasInteractions'
import { useDarkToggle, useWidthPresets } from './useCanvasControls'
import styles from './Canvas.module.css'

export function CanvasToolbar({ children }: { children?: ReactNode }) {
  return <div className={styles.toolbar}>{children}</div>
}

export function CanvasWidthPresets({ presets }: { presets?: CanvasWidthPreset[] }) {
  const control = useWidthPresets(presets)

  return (
    <div className={styles.presets} role="group" aria-label="Canvas width">
      {control.presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={styles.presetButton}
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
      className={styles.presetButton}
      data-active={isDark || undefined}
      aria-pressed={isDark}
      onClick={toggle}
    >
      {children ?? 'Dark'}
    </button>
  )
}

export function CanvasViewport({ className }: { className?: string }) {
  const { canvasRootRef } = useEditorContext()
  const { width, isDark, stylesReady } = useCanvasContext()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const rootId = useRootId()
  const children = useChildren(rootId)
  const interactions = useCanvasInteractions()

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    return combine(
      dropTargetForElements({
        element,
        canDrop: ({ source }) => isEditorDrag(source.data),
        getData: () => surfaceTarget({ surface: 'canvas' }),
      }),
      autoScrollForElements({ element }),
    )
  }, [])

  return (
    <div
      ref={scrollRef}
      data-adt-canvas-scroll=""
      className={className ? `${styles.scroll} ${className}` : styles.scroll}
    >
      <div className={styles.page} style={width ? { width: `${width}px` } : undefined}>
        <div
          ref={canvasRootRef as RefObject<HTMLDivElement>}
          role="group"
          aria-label="Editable preview"
          tabIndex={0}
          className={`adt-canvas${isDark ? ' adt-dark' : ''}`}
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
            <p className={styles.empty}>Empty canvas. Drag an element from the palette.</p>
          ) : null}
        </div>
      </div>

      <SelectionOverlay />
      <DropIndicator surface="canvas" />
    </div>
  )
}
