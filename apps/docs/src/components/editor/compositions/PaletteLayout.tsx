import { HtmlEditor } from '@zignaggo/adt-html-editor'

export function PaletteLayout() {
  return (
    <div className="grid h-full w-full min-w-0 flex-1 grid-cols-[minmax(200px,240px)_minmax(0,1fr)]">
      <HtmlEditor.Palette className="min-h-0 flex-1 overflow-auto border-r border-b-0 border-border">
        <HtmlEditor.Palette.Header>Blocks</HtmlEditor.Palette.Header>
        <HtmlEditor.Palette.Grid />
      </HtmlEditor.Palette>
      <HtmlEditor.Canvas className="min-h-0 min-w-0">
        <HtmlEditor.Canvas.Viewport />
      </HtmlEditor.Canvas>
    </div>
  )
}
