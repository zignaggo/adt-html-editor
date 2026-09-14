import type { ReactNode } from 'react'
import { useHistory } from './useHistory'
import styles from './History.module.css'

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
      className={className ? `${styles.group} ${className}` : styles.group}
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
      className={className ? `${styles.button} ${className}` : styles.button}
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
      className={className ? `${styles.button} ${className}` : styles.button}
      disabled={!canRedo}
      aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
      title="Redo (Ctrl+Shift+Z)"
      onClick={redo}
    >
      {children ?? 'Redo'}
    </button>
  )
}
