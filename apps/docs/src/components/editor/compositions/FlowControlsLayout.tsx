import { HtmlEditor } from '@zignaggo/adt-html-editor'

export function FlowControlsLayout() {
  return (
    <HtmlEditor.Canvas className="h-full w-full min-w-0 flex-1">
      <HtmlEditor.Canvas.Toolbar>
        <HtmlEditor.History />
        <HtmlEditor.Canvas.WidthPresets />
      </HtmlEditor.Canvas.Toolbar>
      <HtmlEditor.Canvas.Viewport>
        <HtmlEditor.Canvas.FlowControls />
        <HtmlEditor.Canvas.FlowToolbar />
      </HtmlEditor.Canvas.Viewport>
      <HtmlEditor.Canvas.FlowStatusBar />
    </HtmlEditor.Canvas>
  )
}
