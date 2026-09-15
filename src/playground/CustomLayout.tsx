import { HtmlEditor } from '../lib'
import { MyClassInput, MyRadiusSlider } from './CustomControls'
import { HistoryControls } from './HistoryControls'
import { MyPalette } from './CustomPalette'
import { MyTreeRow } from './CustomTreeRow'

export function CustomLayout() {
  return (
    <div className="grid h-full min-h-0 w-full grid-cols-[minmax(0,1fr)_minmax(220px,280px)] grid-rows-[minmax(0,1fr)_190px] [grid-template-areas:'canvas_inspector''dock_inspector']">
      <HtmlEditor.Canvas className="min-h-0 min-w-0 [grid-area:canvas]">
        <HtmlEditor.Canvas.Viewport />
        <HtmlEditor.Canvas.Toolbar>
          <HtmlEditor.Canvas.DarkToggle>Dark theme</HtmlEditor.Canvas.DarkToggle>
          <HtmlEditor.Canvas.WidthPresets
            presets={[
              { id: 'narrow', label: '360', width: 360 },
              { id: 'wide', label: '1024', width: 1024 },
              { id: 'fluid', label: 'Fluid', width: 0 },
            ]}
          />
        </HtmlEditor.Canvas.Toolbar>
      </HtmlEditor.Canvas>

      <HtmlEditor.Inspector className="min-h-0 [grid-area:inspector]">
        <HtmlEditor.Inspector.Header />
        <HtmlEditor.Inspector.Empty>
          Nothing selected. Click something on the canvas.
        </HtmlEditor.Inspector.Empty>
        <HtmlEditor.Inspector.Variants />
        <HtmlEditor.Inspector.Body>
          <HtmlEditor.Inspector.Section title="Shortcuts">
            <HtmlEditor.Inspector.Control id="display" />
            <HtmlEditor.Inspector.Control id="gap" />
            <HtmlEditor.Inspector.Control id="p" />
          </HtmlEditor.Inspector.Section>
          <HtmlEditor.Inspector.Category id="typography" />
          <HtmlEditor.Inspector.Category id="color" />
          <HtmlEditor.Inspector.Section title="Custom controls">
            <MyClassInput />
            <MyRadiusSlider />
          </HtmlEditor.Inspector.Section>
          <HtmlEditor.Inspector.Section title="Classes">
            <HtmlEditor.Inspector.ClassInput />
            <HtmlEditor.Inspector.ClassList />
          </HtmlEditor.Inspector.Section>
        </HtmlEditor.Inspector.Body>
      </HtmlEditor.Inspector>

      <div className="grid min-h-0 grid-cols-[minmax(220px,320px)_minmax(0,1fr)] border-t border-border [grid-area:dock]">
        <HistoryControls />
        <HtmlEditor.Layers className="min-h-0">
          <HtmlEditor.Layers.Header>
            <HtmlEditor.Layers.Title>Structure</HtmlEditor.Layers.Title>
            <HtmlEditor.Layers.Count />
          </HtmlEditor.Layers.Header>
          <HtmlEditor.Layers.Search placeholder="Filter by tag, #id, .class or text" />
          <HtmlEditor.Layers.Tree
            renderRow={(row, isFocusable) => (
              <MyTreeRow key={row.id} row={row} isFocusable={isFocusable} />
            )}
          />
        </HtmlEditor.Layers>
        <HtmlEditor.Palette className="min-w-0 overflow-auto">
          <MyPalette />
        </HtmlEditor.Palette>
      </div>
    </div>
  )
}
