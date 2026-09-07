import { useCanRedo, useCanUndo, useEditor, useEditorSelector } from '../lib'
import styles from './HistoryControls.module.css'

export function HistoryControls() {
  const { undo, redo } = useEditor()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const past = useEditorSelector((state) => state.history.past.length)
  const future = useEditorSelector((state) => state.history.future.length)

  return (
    <div className={styles.bar}>
      <button
        type="button"
        id="history-undo"
        className={styles.button}
        disabled={!canUndo}
        onClick={undo}
      >
        Desfazer
      </button>
      <button
        type="button"
        id="history-redo"
        className={styles.button}
        disabled={!canRedo}
        onClick={redo}
      >
        Refazer
      </button>
      <span className={styles.counts} id="history-counts">
        {past} / {future}
      </span>
    </div>
  )
}
