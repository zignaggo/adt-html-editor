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
    <div className={cn('flex flex-none flex-col border-b border-border bg-muted', className)}>
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
      <span className="text-2xs font-semibold tracking-[0.04em] text-muted-foreground uppercase">
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
    <div className="flex flex-wrap gap-1 px-2 pt-1 pb-3">
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
        'min-h-[26px] cursor-grab rounded-sm border-0 bg-card px-2 py-1 font-mono text-2xs text-muted-foreground shadow-sm',
        'transition-[color,background-color,scale,box-shadow] duration-100 ease-out',
        'hover:text-foreground active:scale-95 active:cursor-grabbing',
      )}
      data-dragging={isDragging || undefined}
      title={title}
    >
      {children ?? entry.label}
    </button>
  )
}
