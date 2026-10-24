import { HtmlEditor } from '@zignaggo/adt-html-editor/shadcn'

export function FlowCanvas() {
  return (
    <>
      <HtmlEditor.Canvas.Viewport>
        <HtmlEditor.Canvas.FlowControls />
        <HtmlEditor.Canvas.FlowToolbar />
      </HtmlEditor.Canvas.Viewport>
      <HtmlEditor.Canvas.FlowStatusBar />
      <HtmlEditor.Canvas.Dock>
        <HtmlEditor.Canvas.WidthPresets />
        <HtmlEditor.Canvas.Zoom />
        <HtmlEditor.Canvas.DarkToggle />
      </HtmlEditor.Canvas.Dock>
    </>
  )
}
