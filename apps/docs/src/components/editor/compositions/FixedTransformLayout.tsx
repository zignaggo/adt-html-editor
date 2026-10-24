import { HtmlEditor } from '@zignaggo/adt-html-editor'

export function FixedTransformLayout() {
  return (
    <div className="grid h-full w-full min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
      <HtmlEditor.Canvas className="min-h-0 min-w-0">
        <HtmlEditor.Canvas.Toolbar>
          <HtmlEditor.History />
          <HtmlEditor.Canvas.Zoom />
        </HtmlEditor.Canvas.Toolbar>
        <HtmlEditor.Canvas.FixedPage>
          <HtmlEditor.Canvas.Guides />
          <HtmlEditor.Canvas.LiveGhost />
          <HtmlEditor.Canvas.Handles />
        </HtmlEditor.Canvas.FixedPage>
      </HtmlEditor.Canvas>
      <HtmlEditor.Inspector className="min-h-0">
        <HtmlEditor.Inspector.Header />
        <HtmlEditor.Inspector.Empty />
        <HtmlEditor.Inspector.Body>
          <HtmlEditor.Inspector.Position />
          <HtmlEditor.Inspector.Transform />
        </HtmlEditor.Inspector.Body>
      </HtmlEditor.Inspector>
    </div>
  )
}
