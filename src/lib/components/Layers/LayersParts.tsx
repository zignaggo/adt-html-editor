import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
  type UIEvent,
} from 'react'
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/utils/combine'
import type { NodeId } from '../../core/ids'
import { isEditorDrag, surfaceTarget } from '../../dnd/data'
import { DropIndicator } from '../../dnd/DropIndicator'
import { useEditorSelector } from '../Editor/context'
import type { EditorState } from '../../core/store'
import { useLayersContext } from './context'
import type { LayerRowInfo } from './flatten'
import { LayerRow } from './LayerRow'
import { useLayersSearch } from './useLayersSearch'
import { useTreeKeyboard } from './useTreeKeyboard'
import { cn } from 'cn'

const selectSelectedId = (state: EditorState) => state.selectedId

const emptyClass = 'mx-3 my-4 text-2xs text-pretty text-muted-foreground/70'

const ROW_HEIGHT = 30
const VIRTUALIZE_ABOVE = 300
const OVERSCAN = 10

export function LayersHeader({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
      {children}
    </div>
  )
}

export function LayersTitle({ children }: { children?: ReactNode }) {
  return (
    <span className="text-2xs font-semibold tracking-[0.04em] text-muted-foreground uppercase">
      {children}
    </span>
  )
}

export function LayersCount() {
  const { state } = useLayersContext()
  return (
    <span className="min-w-5 rounded-sm bg-accent px-1.5 py-px text-center text-2xs text-muted-foreground tabular-nums">
      {state.matchCount}
    </span>
  )
}

export function LayersEmpty({ children }: { children?: ReactNode }) {
  const { rows, state } = useLayersContext()
  if (rows.length > 0) return null
  if (state.isSearching) {
    return <p className={emptyClass}>No elements match “{state.query.trim()}”.</p>
  }
  return <p className={emptyClass}>{children ?? 'No elements. Drag something from the palette.'}</p>
}

export type LayersSearchProps = {
  className?: string
  placeholder?: string
  'aria-label'?: string
}

export function LayersSearch({
  className,
  placeholder = 'Search elements…',
  'aria-label': ariaLabel = 'Search elements',
}: LayersSearchProps) {
  const search = useLayersSearch()

  return (
    <div className={cn('border-b border-border px-3 py-1.5', className)}>
      <input
        ref={(element) => search.registerInput(element)}
        type="search"
        className={cn(
          'box-border min-h-[26px] w-full rounded-sm border-0 bg-card px-1.5 py-1 font-mono text-2xs text-foreground',
          'ring-1 ring-border transition-shadow duration-100 ease-out ring-inset hover:ring-foreground/25',
          'placeholder:text-muted-foreground/70',
        )}
        aria-label={ariaLabel}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        value={search.value}
        onChange={(event) => search.setValue(event.target.value)}
        onKeyDown={search.onKeyDown}
      />
    </div>
  )
}

export type LayersScrollerProps = {
  ref: (element: HTMLDivElement | null) => void
  role: 'tree'
  'aria-label': string
  'aria-multiselectable': true
  tabIndex: -1
  className: string | undefined
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onScroll: ((event: UIEvent<HTMLDivElement>) => void) | undefined
  children: ReactNode
}

export type LayersTreeProps = {
  className?: string
  renderRow?: (row: LayerRowInfo, isFocusable: boolean) => ReactNode
  scroller?: ComponentType<LayersScrollerProps>
  empty?: ReactNode
}

function DefaultScroller({ className, ...props }: LayersScrollerProps) {
  return (
    <div
      {...props}
      className={cn(
        'min-h-0 flex-1 overflow-auto overscroll-contain pt-1 pb-4 [scrollbar-width:thin]',
        '[scrollbar-color:var(--scrollbar-thumb)_transparent]',
        'focus-visible:-outline-offset-2!',
        className,
      )}
    />
  )
}

export function LayersTree({
  className,
  renderRow,
  scroller: Scroller = DefaultScroller,
  empty,
}: LayersTreeProps) {
  const { rows, meta } = useLayersContext()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const attachScroll = (element: HTMLDivElement | null) => {
    scrollRef.current = element
    meta.registerTree(element)
  }
  const selectedId = useEditorSelector(selectSelectedId)
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 0 })

  const onKeyDown = useTreeKeyboard(rows)
  const isVirtual = rows.length > VIRTUALIZE_ABOVE

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    return combine(
      dropTargetForElements({
        element,
        canDrop: ({ source }) => isEditorDrag(source.data),
        getData: () => surfaceTarget({ surface: 'tree' }),
      }),
      autoScrollForElements({ element }),
    )
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    if (!element || !isVirtual) return
    const observer = new ResizeObserver(() => {
      setViewport((current) =>
        current.height === element.clientHeight
          ? current
          : { ...current, height: element.clientHeight },
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [isVirtual])

  const revealRow = useEffectEvent((id: NodeId) => {
    const element = scrollRef.current
    if (!element) return
    if (isVirtual) {
      const index = rows.findIndex((row) => row.id === id)
      if (index < 0) return
      const top = index * ROW_HEIGHT
      const bottom = top + ROW_HEIGHT
      if (top < element.scrollTop) element.scrollTop = top
      else if (bottom > element.scrollTop + element.clientHeight) {
        element.scrollTop = bottom - element.clientHeight
      }
      return
    }
    element.querySelector(`[data-node-id="${id}"]`)?.scrollIntoView({ block: 'nearest' })
  })

  useEffect(() => {
    if (selectedId) revealRow(selectedId)
  }, [selectedId])

  const first = isVirtual ? Math.max(0, Math.floor(viewport.scrollTop / ROW_HEIGHT) - OVERSCAN) : 0
  const last = isVirtual
    ? Math.min(rows.length, Math.ceil((viewport.scrollTop + viewport.height) / ROW_HEIGHT) + OVERSCAN)
    : rows.length
  const visible = isVirtual ? rows.slice(first, last) : rows

  return (
    <Scroller
      ref={attachScroll}
      role="tree"
      aria-label="Element tree"
      aria-multiselectable
      tabIndex={-1}
      className={className}
      onKeyDown={onKeyDown}
      onScroll={
        isVirtual
          ? (event) => {
              const { scrollTop } = event.currentTarget
              setViewport((current) =>
                Math.abs(current.scrollTop - scrollTop) < ROW_HEIGHT / 2
                  ? current
                  : { ...current, scrollTop },
              )
            }
          : undefined
      }
    >
      <div
        className={isVirtual ? 'relative w-full' : undefined}
        style={isVirtual ? { height: `${rows.length * ROW_HEIGHT}px` } : undefined}
      >
        <div
          className={isVirtual ? 'absolute top-0 left-0 w-full will-change-transform' : undefined}
          style={isVirtual ? { transform: `translateY(${first * ROW_HEIGHT}px)` } : undefined}
        >
          {visible.map((row) =>
            renderRow ? (
              renderRow(row, row.id === selectedId)
            ) : (
              <LayerRow
                key={row.id}
                id={row.id}
                level={row.level}
                mode={row.mode}
                hasChildren={row.hasChildren}
                isMatch={row.isMatch}
                isFocusable={row.id === selectedId}
              />
            ),
          )}
        </div>
      </div>
      {empty === undefined ? <LayersEmpty /> : empty}
      <DropIndicator surface="tree" />
    </Scroller>
  )
}
