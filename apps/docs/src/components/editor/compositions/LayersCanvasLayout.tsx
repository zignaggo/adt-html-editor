import { HtmlEditor } from '@zignaggo/adt-html-editor'

export function LayersCanvasLayout() {
  return (
    <div className="grid h-full w-full min-w-0 flex-1 grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
      <HtmlEditor.Layers className="min-h-0" />
      <HtmlEditor.Canvas className="min-h-0 min-w-0">
        <HtmlEditor.Canvas.Toolbar>
          <HtmlEditor.History />
          <HtmlEditor.Canvas.WidthPresets />
        </HtmlEditor.Canvas.Toolbar>
        <HtmlEditor.Canvas.Viewport />
      </HtmlEditor.Canvas>
    </div>
  )
}
