import { HtmlEditor } from '@zignaggo/adt-html-editor/shadcn'

export function FixedImageCanvas() {
  return (
    <>
      <HtmlEditor.Canvas.FixedPage>
        <HtmlEditor.Canvas.Guides />
        <HtmlEditor.Canvas.ImageGhost />
        <HtmlEditor.Canvas.Handles />
      </HtmlEditor.Canvas.FixedPage>
      <HtmlEditor.Canvas.Dock>
        <HtmlEditor.Canvas.Zoom />
        <HtmlEditor.Canvas.DarkToggle />
      </HtmlEditor.Canvas.Dock>
    </>
  )
}
