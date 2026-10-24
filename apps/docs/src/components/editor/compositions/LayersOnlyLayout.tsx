import { HtmlEditor } from '@zignaggo/adt-html-editor'

export function LayersOnlyLayout() {
  return (
    <div className="flex h-full w-full min-w-0 flex-1 justify-center bg-muted/40 p-4">
      <HtmlEditor.Layers className="min-h-0 w-full max-w-sm rounded-lg border border-border bg-background">
        <HtmlEditor.Layers.Header>
          <HtmlEditor.Layers.Title>Layers</HtmlEditor.Layers.Title>
          <HtmlEditor.Layers.Count />
        </HtmlEditor.Layers.Header>
        <HtmlEditor.Layers.Search placeholder="tag, #id, .class or text" />
        <HtmlEditor.Layers.Tree />
        <HtmlEditor.Layers.Empty>Nothing matched.</HtmlEditor.Layers.Empty>
      </HtmlEditor.Layers>
    </div>
  )
}
