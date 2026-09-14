import { HtmlEditor, useEditorSelector } from '../lib'
import styles from './HistoryControls.module.css'

/** Composition example: lib parts with custom labels + an extra playground-only part. */
export function HistoryControls() {
  return (
    <HtmlEditor.History className={styles.bar}>
      <HtmlEditor.History.Undo>↶ Undo</HtmlEditor.History.Undo>
      <HtmlEditor.History.Redo>Redo ↷</HtmlEditor.History.Redo>
      <HistoryCounts />
    </HtmlEditor.History>
  )
}

function HistoryCounts() {
  const past = useEditorSelector((state) => state.history.past.length)
  const future = useEditorSelector((state) => state.history.future.length)
  return (
    <span className={styles.counts} id="history-counts">
      {past} / {future}
    </span>
  )
}
