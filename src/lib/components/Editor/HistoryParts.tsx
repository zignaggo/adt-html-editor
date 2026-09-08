import type { ReactNode } from 'react'
import { useHistory } from './useHistory'
import styles from './History.module.css'

export type HistoryProps = {
  className?: string
  children?: ReactNode
}

/** Raiz do grupo de histórico. Sem children renderiza `Undo` + `Redo`. */
export function HistoryGroup({ className, children }: HistoryProps) {
  return (
    <div
      role="group"
      aria-label="Histórico"
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
      title="Desfazer (Ctrl+Z)"
      onClick={undo}
    >
      {children ?? 'Desfazer'}
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
      title="Refazer (Ctrl+Shift+Z)"
      onClick={redo}
    >
      {children ?? 'Refazer'}
    </button>
  )
}
