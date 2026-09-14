import type { ReactNode } from 'react'
import { PALETTE_ENTRIES, type PaletteEntry } from '../../../lib/components/Palette/templates'
import { usePaletteDraggable } from '../../../lib/components/Palette/usePaletteDraggable'
import { cn } from '../../lib/utils'
import { Button } from '../../ui/button'

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

export function PaletteGrid({
  entries = PALETTE_ENTRIES,
  children,
}: {
  entries?: PaletteEntry[]
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {children ?? entries.map((entry) => <PaletteItem key={entry.id} entry={entry} />)}
    </div>
  )
}

export function PaletteItem({ entry, children }: { entry: PaletteEntry; children?: ReactNode }) {
  const { setElement, isDragging, title } = usePaletteDraggable(entry)
  return (
    <Button
      ref={setElement}
      variant="outline"
      size="xs"
      className="cursor-grab font-mono data-dragging:opacity-50"
      data-dragging={isDragging || undefined}
      title={title}
    >
      {children ?? entry.label}
    </Button>
  )
}
