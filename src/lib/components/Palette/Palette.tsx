import type { ReactNode } from 'react'
import { PALETTE_ENTRIES, type PaletteEntry } from './templates'
import { usePaletteDraggable } from './usePaletteDraggable'
import styles from './Palette.module.css'

export type PaletteProps = {
  className?: string
  entries?: PaletteEntry[]
  children?: ReactNode
}

export function Palette({ className, entries = PALETTE_ENTRIES, children }: PaletteProps) {
  return (
    <div className={className ? `${styles.palette} ${className}` : styles.palette}>
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
    <div className={styles.header}>
      <span className={styles.title}>{children}</span>
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
    <div className={styles.grid}>
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
      className={styles.item}
      data-dragging={isDragging || undefined}
      title={title}
    >
      {children ?? entry.label}
    </button>
  )
}
