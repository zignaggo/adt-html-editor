import type { ReactNode } from 'react'
import { cn } from 'cn'
import { PALETTE_ENTRIES, type PaletteEntry } from './templates'
import { usePaletteDraggable } from './usePaletteDraggable'

export type PaletteProps = {
  className?: string
  entries?: PaletteEntry[]
  children?: ReactNode
}

export function Palette({ className, entries = PALETTE_ENTRIES, children }: PaletteProps) {
  return (
    <div className={cn('flex flex-none flex-col border-b border-border bg-background', className)}>
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
    <div className="px-3 pt-2 pb-1">
      <span className="text-xs font-medium text-muted-foreground">
        {children}
      </span>
    </div>
  )
}

export function PaletteGrid({
  entries = PALETTE_ENTRIES,
  children,
}: {
  entries?: PaletteEntry[]
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-1 pb-3">
      {children ?? entries.map((entry) => <PaletteItem key={entry.id} entry={entry} />)}
    </div>
  )
}

export function PaletteItem({ entry, children }: { entry: PaletteEntry; children?: ReactNode }) {
  const { setElement, isDragging, title } = usePaletteDraggable(entry)

  return (
    <button
      ref={setElement}
      type="button"
      className={cn(
        'inline-flex h-7 cursor-grab items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border',
        'bg-background px-2.5 font-mono text-xs font-medium text-muted-foreground transition-all',
        'hover:bg-muted hover:text-foreground active:translate-y-px active:cursor-grabbing',
        'dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        'data-dragging:opacity-40',
      )}
      data-dragging={isDragging || undefined}
      title={title}
    >
      {children ?? entry.label}
    </button>
  )
}
