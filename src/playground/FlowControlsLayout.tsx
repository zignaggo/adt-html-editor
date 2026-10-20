import { HtmlEditor } from '../lib'

export function FlowControlsLayout() {
  return (
    <HtmlEditor.Layout>
      <HtmlEditor.Layers />
      <HtmlEditor.Canvas>
        <HtmlEditor.Canvas.Toolbar>
          <HtmlEditor.History />
          <HtmlEditor.Canvas.WidthPresets />
          <HtmlEditor.Canvas.DarkToggle />
        </HtmlEditor.Canvas.Toolbar>
        <HtmlEditor.Canvas.Viewport>
          <HtmlEditor.Canvas.FlowControls />
        </HtmlEditor.Canvas.Viewport>
        <HtmlEditor.Canvas.FlowStatusBar />
      </HtmlEditor.Canvas>
      <HtmlEditor.Inspector />
    </HtmlEditor.Layout>
  )
}
