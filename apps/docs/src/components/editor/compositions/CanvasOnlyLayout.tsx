import { HtmlEditor } from '@zignaggo/adt-html-editor'

export function CanvasOnlyLayout() {
  return (
    <HtmlEditor.Canvas className="h-full w-full min-w-0 flex-1">
      <HtmlEditor.Canvas.Toolbar>
        <HtmlEditor.History />
        <HtmlEditor.Canvas.WidthPresets />
      </HtmlEditor.Canvas.Toolbar>
      <HtmlEditor.Canvas.Viewport />
    </HtmlEditor.Canvas>
  )
}
