import type { ReactNode } from 'react'
import { useHistory } from './useHistory'
import { cn } from 'cn'

const historyButtonClass =
  'h-[26px] min-w-16 cursor-default rounded-sm border-0 bg-transparent px-2 font-[inherit] text-2xs font-medium text-muted-foreground ' +
  'transition-[background-color,color,opacity,scale] duration-100 ease-out ' +
  'hover:not-disabled:bg-card hover:not-disabled:text-foreground hover:not-disabled:shadow-sm ' +
  'active:not-disabled:scale-95 disabled:opacity-40'

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
      className={cn('flex gap-0.5 rounded-md bg-accent p-0.5', className)}
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
