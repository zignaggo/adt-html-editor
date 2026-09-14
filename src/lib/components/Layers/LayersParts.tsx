import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/utils/combine'
import type { NodeId } from '../../core/ids'
import { isEditorDrag, surfaceTarget } from '../../dnd/data'
import { DropIndicator } from '../../dnd/DropIndicator'
import { useEditorSelector, useEditorStoreApi } from '../Editor/context'
import { useLayersContext } from './context'
import type { LayerRowInfo } from './flatten'
import { LayerRow } from './LayerRow'
import { useTreeKeyboard } from './useTreeKeyboard'
import styles from './LayersPanel.module.css'

const ROW_HEIGHT = 30
const VIRTUALIZE_ABOVE = 300
const OVERSCAN = 10

export function LayersHeader({ children }: { children?: ReactNode }) {
  return <div className={styles.header}>{children}</div>
}

export function LayersTitle({ children }: { children?: ReactNode }) {
  return <span className={styles.title}>{children}</span>
}

export function LayersCount() {
  const { state } = useLayersContext()
  return <span className={styles.count}>{state.matchCount}</span>
}

export function LayersEmpty({ children }: { children?: ReactNode }) {
  const { rows, state } = useLayersContext()
  if (rows.length > 0) return null
  if (state.isSearching) {
    return <p className={styles.empty}>No elements match “{state.query.trim()}”.</p>
  }
  return <p className={styles.empty}>{children ?? 'No elements. Drag something from the palette.'}</p>
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
  const { rows, state, actions, meta } = useLayersContext()
  const store = useEditorStoreApi()
  const { focusTree } = actions

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (!state.query) return
      event.preventDefault()
      actions.clearSearch()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'Enter') return
    if (rows.length === 0) return
    event.preventDefault()
    const { selectedId } = store.state
    if (!selectedId || !rows.some((row) => row.id === selectedId)) {
      const target = rows.find((row) => row.isMatch) ?? rows[0]
      store.actions.select(target.id)
    }
    focusTree()
  }

  return (
    <div className={className ? `${styles.search} ${className}` : styles.search}>
      <input
        ref={(element) => meta.registerSearch(element)}
        type="search"
        className={styles.searchInput}
        aria-label={ariaLabel}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        value={state.query}
        onChange={(event) => actions.setQuery(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}

export type LayersTreeProps = {
  className?: string
  renderRow?: (row: LayerRowInfo, isFocusable: boolean) => ReactNode
}

export function LayersTree({ className, renderRow }: LayersTreeProps) {
  const { rows, meta } = useLayersContext()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const attachScroll = (element: HTMLDivElement | null) => {
    scrollRef.current = element
    meta.registerTree(element)
  }
  const selectedId = useEditorSelector((state) => state.selectedId)
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
    <div
      ref={attachScroll}
      role="tree"
      aria-label="Element tree"
      tabIndex={-1}
      className={className ? `${styles.scroll} ${className}` : styles.scroll}
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
        className={isVirtual ? styles.virtualSizer : undefined}
        style={isVirtual ? { height: `${rows.length * ROW_HEIGHT}px` } : undefined}
      >
        <div
          className={isVirtual ? styles.virtualWindow : undefined}
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
      <LayersEmpty />
      <DropIndicator surface="tree" />
    </div>
  )
}
