import { HtmlEditor, useEditorSelector } from '../lib'
import styles from './HistoryControls.module.css'

/** Exemplo de composição: partes da lib com rótulos próprios + uma parte extra do playground. */
export function HistoryControls() {
  return (
    <HtmlEditor.History className={styles.bar}>
      <HtmlEditor.History.Undo>↶ Desfazer</HtmlEditor.History.Undo>
      <HtmlEditor.History.Redo>Refazer ↷</HtmlEditor.History.Redo>
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
