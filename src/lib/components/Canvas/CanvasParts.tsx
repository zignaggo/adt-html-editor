import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/utils/combine'
import { setHovered } from '../../core/hover'
import { isEditorDrag, surfaceTarget } from '../../dnd/data'
import { DropIndicator } from '../../dnd/DropIndicator'
import { useChildren, useEditor, useEditorContext, useEditorSelector, useRootId } from '../Editor/context'
import { CanvasNode } from './CanvasNode'
import { DEFAULT_WIDTH_PRESETS, useCanvasContext, type CanvasWidthPreset } from './context'
import { SelectionOverlay } from './SelectionOverlay'
import styles from './Canvas.module.css'

export function CanvasToolbar({ children }: { children?: ReactNode }) {
  return <div className={styles.toolbar}>{children}</div>
}

export function CanvasWidthPresets({ presets = DEFAULT_WIDTH_PRESETS }: { presets?: CanvasWidthPreset[] }) {
  const { presetId, setPreset } = useCanvasContext()

  return (
    <div className={styles.presets} role="group" aria-label="Largura do canvas">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={styles.presetButton}
          data-active={preset.id === presetId || undefined}
          aria-pressed={preset.id === presetId}
          onClick={() => setPreset(preset)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}

export function CanvasDarkToggle({ children }: { children?: ReactNode }) {
  const { isDark, setIsDark } = useCanvasContext()
  return (
    <button
      type="button"
      className={styles.presetButton}
      data-active={isDark || undefined}
      aria-pressed={isDark}
      onClick={() => setIsDark(!isDark)}
    >
      {children ?? 'Dark'}
    </button>
  )
}

export function CanvasViewport({ className }: { className?: string }) {
  const { canvasRootRef } = useEditorContext()
  const { width, isDark } = useCanvasContext()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const rootId = useRootId()
  const children = useChildren(rootId)
  const { select, beginTextEdit, removeNode } = useEditor()
  const selectedId = useEditorSelector((state) => state.selectedId)

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

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const target = (event.target as HTMLElement).closest('[data-adt-id]')
    setHovered(target?.getAttribute('data-adt-id') ?? null)
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).isContentEditable) return

    if (event.key === 'Escape') {
      select(null)
      return
    }

    const focused = (event.target as HTMLElement).closest('[data-adt-id]')
    const id = focused?.getAttribute('data-adt-id') ?? selectedId
    if (!id) return

    if (event.key === 'Enter') {
      event.preventDefault()
      beginTextEdit(id)
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      removeNode(id)
    }
  }

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
          aria-label="Pré-visualização editável"
          tabIndex={0}
          className={`adt-canvas${isDark ? ' adt-dark' : ''}`}
          data-adt-canvas=""
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHovered(null)}
          onClick={(event) => {
            const target = (event.target as HTMLElement).closest('[data-adt-id]')
            select(target?.getAttribute('data-adt-id') ?? null)
          }}
          onDoubleClick={(event) => {
            const target = (event.target as HTMLElement).closest('[data-adt-id]')
            const id = target?.getAttribute('data-adt-id')
            if (id) beginTextEdit(id)
          }}
          onKeyDown={onKeyDown}
        >
          {children.map((childId) => (
            <CanvasNode key={childId} id={childId} />
          ))}
          {children.length === 0 ? (
            <p className={styles.empty}>Canvas vazio. Arraste um elemento da paleta.</p>
          ) : null}
        </div>
      </div>

      <SelectionOverlay />
      <DropIndicator surface="canvas" />
    </div>
  )
}
