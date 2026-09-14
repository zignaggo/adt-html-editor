import type { ReactNode } from 'react'
import { PALETTE_ENTRIES, type PaletteEntry } from '../../../lib/components/Palette/templates'
import { usePaletteDraggable } from '../../../lib/components/Palette/usePaletteDraggable'
import { cn } from '../../lib/utils'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '../../ui/empty'
import { filterPaletteEntries } from './paletteFilter'
import { PalettePreview } from './PalettePreview'

export type PaletteProps = {
  className?: string
  entries?: PaletteEntry[]
  children?: ReactNode
}

export function Palette({ className, entries = PALETTE_ENTRIES, children }: PaletteProps) {
  return (
    <div className={cn('flex flex-col gap-2 border-b border-border bg-background p-3 text-foreground', className)}>
      {children ?? (
        <>
          <PaletteHeader>Palette</PaletteHeader>
          <PaletteGrid entries={entries} />
        </>
      )}
    </div>
  )
}

export function PaletteHeader({ children }: { children?: ReactNode }) {
  return (
    <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</span>
  )
}

export type PaletteGridProps = {
  entries?: PaletteEntry[]
  query?: string
  className?: string
  children?: ReactNode
}

export function PaletteGrid({ entries = PALETTE_ENTRIES, query = '', className, children }: PaletteGridProps) {
  const visible = filterPaletteEntries(entries, query)
  if (!children && visible.length === 0) {
    return (
      <Empty className="border-0 p-4">
        <EmptyHeader>
          <EmptyTitle className="text-sm">No blocks</EmptyTitle>
          <EmptyDescription>No blocks match “{query.trim()}”.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <ul className={cn('grid grid-cols-2 gap-1.5', className)} aria-label="Palette">
      {children ?? visible.map((entry) => <PaletteItem key={entry.id} entry={entry} />)}
    </ul>
  )
}

export function PaletteItem({ entry, children }: { entry: PaletteEntry; children?: ReactNode }) {
  const { setElement, isDragging, title } = usePaletteDraggable(entry)
  return (
    <li className="flex min-w-0">
      <button
        ref={setElement}
        type="button"
        title={title}
        data-dragging={isDragging || undefined}
        className={cn(
          'flex w-full min-w-0 cursor-grab flex-col gap-1.5 rounded-lg border border-border bg-card p-1.5 text-left text-card-foreground outline-none transition-colors',
          'hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing data-dragging:opacity-50',
        )}
      >
        {children ?? (
          <>
            <span
              aria-hidden="true"
              className="flex h-12 w-full items-center justify-center overflow-hidden rounded-md bg-muted/50 px-2 text-foreground/80"
            >
              <PalettePreview template={entry.template} />
            </span>
            <span className="flex items-center justify-between gap-1">
              <span className="truncate text-xs">{entry.label}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{entry.template.tag}</span>
            </span>
          </>
        )}
      </button>
    </li>
  )
}
