import { HtmlEditor } from '@zignaggo/adt-html-editor'

export function FlowInspectorLayout() {
  return (
    <div className="grid h-full w-full min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
      <HtmlEditor.Canvas className="min-h-0 min-w-0">
        <HtmlEditor.Canvas.Toolbar>
          <HtmlEditor.History />
          <HtmlEditor.Canvas.WidthPresets />
        </HtmlEditor.Canvas.Toolbar>
        <HtmlEditor.Canvas.Viewport />
      </HtmlEditor.Canvas>
      <HtmlEditor.Inspector className="min-h-0" />
    </div>
  )
}
