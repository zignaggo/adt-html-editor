import { HtmlEditor, useEditorSelector } from '../lib'

/** Composition example: lib parts with custom labels + an extra playground-only part. */
export function HistoryControls() {
  return (
    <HtmlEditor.History className="m-1.5 items-center">
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
    <span
      className="ms-auto pe-1.5 font-mono text-[10px] text-muted-foreground tabular-nums"
      id="history-counts"
    >
      {past} / {future}
    </span>
  )
}
