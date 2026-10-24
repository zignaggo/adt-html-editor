import { HtmlEditor } from '@zignaggo/adt-html-editor'

export function FixedImageLayout() {
  return (
    <HtmlEditor.Canvas className="h-full w-full min-w-0 flex-1">
      <HtmlEditor.Canvas.Toolbar>
        <HtmlEditor.History />
        <HtmlEditor.Canvas.Zoom />
      </HtmlEditor.Canvas.Toolbar>
      <HtmlEditor.Canvas.FixedPage>
        <HtmlEditor.Canvas.Guides />
        <HtmlEditor.Canvas.ImageGhost />
      </HtmlEditor.Canvas.FixedPage>
    </HtmlEditor.Canvas>
  )
}
