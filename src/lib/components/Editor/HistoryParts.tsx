import type { ReactNode } from 'react'
import { useHistory } from './useHistory'
import { cn } from 'cn'

const historyButtonClass =
  'inline-flex h-7 cursor-default items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] ' +
  'border border-transparent bg-transparent px-2.5 font-[inherit] text-xs font-medium whitespace-nowrap ' +
  'text-foreground transition-all hover:not-disabled:bg-muted hover:not-disabled:text-foreground ' +
  'active:not-disabled:translate-y-px disabled:pointer-events-none disabled:opacity-50'

export type HistoryProps = {
  className?: string
  children?: ReactNode
}

/** Root of the history group. Without children it renders `Undo` + `Redo`. */
export function HistoryGroup({ className, children }: HistoryProps) {
  return (
    <div
      role="group"
      aria-label="History"
      className={cn('flex items-center gap-1', className)}
    >
      {children ?? (
        <>
          <HistoryUndo />
          <HistoryRedo />
        </>
      )}
    </div>
  )
}

export type HistoryButtonProps = {
  className?: string
  children?: ReactNode
}

export function HistoryUndo({ className, children }: HistoryButtonProps) {
  const { canUndo, undo } = useHistory()
  return (
    <button
      type="button"
      className={cn(historyButtonClass, className)}
      disabled={!canUndo}
      aria-keyshortcuts="Control+Z Meta+Z"
      title="Undo (Ctrl+Z)"
      onClick={undo}
    >
      {children ?? 'Undo'}
    </button>
  )
}

export function HistoryRedo({ className, children }: HistoryButtonProps) {
  const { canRedo, redo } = useHistory()
  return (
    <button
      type="button"
      className={cn(historyButtonClass, className)}
      disabled={!canRedo}
      aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
      title="Redo (Ctrl+Shift+Z)"
      onClick={redo}
    >
      {children ?? 'Redo'}
    </button>
  )
}
