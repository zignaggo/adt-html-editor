import { HtmlEditor } from '../lib'
import { MyClassInput, MyRadiusSlider } from './CustomControls'
import { HistoryControls } from './HistoryControls'
import { MyPalette } from './CustomPalette'
import { MyTreeRow } from './CustomTreeRow'
import styles from './CustomLayout.module.css'

export function CustomLayout() {
  return (
    <div className={styles.grid}>
      <HtmlEditor.Canvas className={styles.canvas}>
        <HtmlEditor.Canvas.Viewport />
        <HtmlEditor.Canvas.Toolbar>
          <HtmlEditor.Canvas.DarkToggle>Tema escuro</HtmlEditor.Canvas.DarkToggle>
          <HtmlEditor.Canvas.WidthPresets
            presets={[
              { id: 'narrow', label: '360', width: 360 },
              { id: 'wide', label: '1024', width: 1024 },
              { id: 'fluid', label: 'Fluido', width: 0 },
            ]}
          />
        </HtmlEditor.Canvas.Toolbar>
      </HtmlEditor.Canvas>

      <HtmlEditor.Inspector className={styles.inspector}>
        <HtmlEditor.Inspector.Header />
        <HtmlEditor.Inspector.Empty>
          Nada selecionado. Clique em algo no canvas.
        </HtmlEditor.Inspector.Empty>
        <HtmlEditor.Inspector.Variants />
        <HtmlEditor.Inspector.Body>
          <HtmlEditor.Inspector.Section title="Atalhos">
            <HtmlEditor.Inspector.Control id="display" />
            <HtmlEditor.Inspector.Control id="gap" />
            <HtmlEditor.Inspector.Control id="p" />
          </HtmlEditor.Inspector.Section>
          <HtmlEditor.Inspector.Category id="typography" />
          <HtmlEditor.Inspector.Category id="color" />
          <HtmlEditor.Inspector.Section title="Controles próprios">
            <MyClassInput />
            <MyRadiusSlider />
          </HtmlEditor.Inspector.Section>
          <HtmlEditor.Inspector.Section title="Classes">
            <HtmlEditor.Inspector.ClassInput />
            <HtmlEditor.Inspector.ClassList />
          </HtmlEditor.Inspector.Section>
        </HtmlEditor.Inspector.Body>
      </HtmlEditor.Inspector>

      <div className={styles.dock}>
        <HistoryControls />
        <HtmlEditor.Layers className={styles.layers}>
          <HtmlEditor.Layers.Header>
            <HtmlEditor.Layers.Title>Estrutura</HtmlEditor.Layers.Title>
            <HtmlEditor.Layers.Count />
          </HtmlEditor.Layers.Header>
          <HtmlEditor.Layers.Tree
            renderRow={(row, isFocusable) => (
              <MyTreeRow key={row.id} row={row} isFocusable={isFocusable} />
            )}
          />
        </HtmlEditor.Layers>
        <HtmlEditor.Palette className={styles.palette}>
          <MyPalette />
        </HtmlEditor.Palette>
      </div>
    </div>
  )
}
