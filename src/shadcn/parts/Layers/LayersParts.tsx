import { memo } from 'react'
import type { ReactNode } from 'react'
import { ChevronRightIcon, SearchIcon, XIcon } from 'lucide-react'
import { useLayersContext } from '../../../lib/components/Layers/context'
import type { LayerRowInfo } from '../../../lib/components/Layers/flatten'
import { LayersProvider } from '../../../lib/components/Layers/LayersPanel'
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
import {
  LayersTree as CoreLayersTree,
  type LayersScrollerProps,
} from '../../../lib/components/Layers/LayersParts'
import { useLayerRow } from '../../../lib/components/Layers/useLayerRow'
import { useLayersSearch } from '../../../lib/components/Layers/useLayersSearch'
import type { NodeId } from '../../../lib/core/ids'
import type { ItemMode } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item'
import { cn } from '../../lib/utils'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '../../ui/empty'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../../ui/input-group'
import { ScrollBar } from '../../ui/scroll-area'

export type LayersPanelProps = {
  className?: string
  children?: ReactNode
}

export function LayersPanel({ className, children }: LayersPanelProps) {
  return (
    <LayersProvider>
      <div className={cn('flex min-h-0 flex-col border-r bg-background text-foreground', className)}>
        {children ?? (
          <>
            <LayersHeader>
              <LayersTitle>Layers</LayersTitle>
              <LayersCount />
            </LayersHeader>
            <LayersSearch />
            <LayersTree />
          </>
        )}
      </div>
    </LayersProvider>
  )
}

export function LayersHeader({ children }: { children?: ReactNode }) {
  return <div className="flex h-10 shrink-0 items-center gap-2 px-3">{children}</div>
}

export function LayersTitle({ children }: { children?: ReactNode }) {
  return (
    <span className="flex-1 truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </span>
  )
}

export function LayersCount() {
  const { state } = useLayersContext()
  return <Badge variant="secondary">{state.matchCount}</Badge>
}

export function LayersEmpty({ children }: { children?: ReactNode }) {
  const { rows, state } = useLayersContext()
  if (rows.length > 0) return null
  return (
    <Empty className="border-0 p-4">
      <EmptyHeader>
        <EmptyTitle className="text-sm">
          {state.isSearching ? 'No matches' : 'No elements'}
        </EmptyTitle>
        <EmptyDescription>
          {state.isSearching
            ? `No elements match “${state.query.trim()}”.`
            : (children ?? 'Drag something from the palette.')}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
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
    <div className={cn('px-3 pb-2', className)}>
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          ref={(element) => search.registerInput(element)}
          type="search"
          aria-label={ariaLabel}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          value={search.value}
          onChange={(event) => search.setValue(event.target.value)}
          onKeyDown={search.onKeyDown}
        />
        {search.value ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={search.clear}>
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </div>
  )
}

export type LayersTreeProps = {
  className?: string
  renderRow?: (row: LayerRowInfo, isFocusable: boolean) => ReactNode
}

function defaultRow(row: LayerRowInfo, isFocusable: boolean) {
  return (
    <LayerRow
      key={row.id}
      id={row.id}
      level={row.level}
      mode={row.mode}
      hasChildren={row.hasChildren}
      isMatch={row.isMatch}
      isFocusable={isFocusable}
    />
  )
}

function LayersScrollArea({ ref, className, children, ...viewport }: LayersScrollerProps) {
  return (
    <ScrollAreaPrimitive.Root className={cn('relative min-h-0 flex-1', className)}>
      <ScrollAreaPrimitive.Viewport
        ref={ref}
        {...viewport}
        data-slot="scroll-area-viewport"
        className="size-full px-1 pb-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

export function LayersTree({ className, renderRow = defaultRow }: LayersTreeProps) {
  return (
    <CoreLayersTree
      className={className}
      renderRow={renderRow}
      scroller={LayersScrollArea}
      empty={<LayersEmpty />}
    />
  )
}

export type LayerRowProps = {
  id: NodeId
  level: number
  mode: ItemMode
  hasChildren: boolean
  isFocusable: boolean
  isMatch?: boolean
}

export const LayerRow = memo(function LayerRow({ id, level, mode, hasChildren, isFocusable, isMatch }: LayerRowProps) {
  const { setElement, node, classes, indent, isCollapsed, rowProps, chevronProps } = useLayerRow({
    id,
    level,
    mode,
    hasChildren,
    isFocusable,
    isMatch,
  })

  if (!node) return null

  return (
    <div
      ref={setElement}
      {...rowProps}
      className={cn(
        'group/row relative flex h-[30px] cursor-default items-center gap-1 rounded-md pr-2 text-sm outline-none select-none',
        'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50',
        'data-selected:bg-accent data-selected:text-accent-foreground',
        'data-muted:opacity-50 data-dragging:opacity-40',
      )}
      style={{ paddingInlineStart: `${indent}px` }}
    >
      {hasChildren ? (
        <Button
          {...chevronProps}
          variant="ghost"
          size="icon-xs"
          className="size-5 shrink-0 text-muted-foreground"
        >
          <ChevronRightIcon className={cn('transition-transform', !isCollapsed && 'rotate-90')} />
        </Button>
      ) : (
        <span className="size-5 shrink-0" aria-hidden="true" />
      )}
      <LayerLabel node={node} />
      {classes.length > 0 ? (
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={classes.join(' ')}>
          {classes.join(' ')}
        </span>
      ) : null}
    </div>
  )
})

function LayerLabel({ node }: { node: NonNullable<ReturnType<typeof useLayerRow>['node']> }) {
  if (node.kind === 'element' || node.kind === 'opaque') {
    const id = node.attrs.id
    return (
      <span className="flex shrink-0 items-baseline gap-1 font-mono text-xs">
        <span className="text-foreground">{node.tag}</span>
        {id ? <span className="text-muted-foreground">#{id}</span> : null}
      </span>
    )
  }
  return (
    <span className="flex min-w-0 items-baseline gap-1 text-xs">
      {node.kind === 'comment' ? <span className="font-mono text-muted-foreground">comment</span> : null}
      <span className="truncate text-muted-foreground italic">{node.value.trim() || 'text'}</span>
    </span>
  )
}
