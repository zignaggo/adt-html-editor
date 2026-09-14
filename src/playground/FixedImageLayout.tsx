import { HtmlEditor } from '../lib'

export function FixedImageLayout() {
  return (
    <HtmlEditor.Layout>
      <HtmlEditor.Layers />
      <HtmlEditor.Canvas>
        <HtmlEditor.Canvas.Toolbar>
          <HtmlEditor.History />
          <HtmlEditor.Canvas.Zoom />
          <HtmlEditor.Canvas.DarkToggle />
        </HtmlEditor.Canvas.Toolbar>
        <HtmlEditor.Canvas.FixedPage>
          <HtmlEditor.Canvas.Guides />
          <HtmlEditor.Canvas.ImageGhost />
        </HtmlEditor.Canvas.FixedPage>
      </HtmlEditor.Canvas>
      <HtmlEditor.Inspector>
        <HtmlEditor.Inspector.Header />
        <HtmlEditor.Inspector.Empty />
        <HtmlEditor.Inspector.Body>
          <HtmlEditor.Inspector.Position />
          <HtmlEditor.Inspector.Section title="Attributes">
            <HtmlEditor.Inspector.Attributes />
          </HtmlEditor.Inspector.Section>
        </HtmlEditor.Inspector.Body>
      </HtmlEditor.Inspector>
    </HtmlEditor.Layout>
  )
}
