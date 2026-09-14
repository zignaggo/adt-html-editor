import { useRef, type ReactNode } from 'react'
import { Canvas, CanvasFixedPage } from '../Canvas/Canvas'
import {
  CanvasDarkToggle,
  CanvasToolbar,
  CanvasViewport,
  CanvasWidthPresets,
} from '../Canvas/CanvasParts'
import { ImageGhost } from '../../fixed/ghost/ImageGhost'
import { LiveGhost } from '../../fixed/ghost/LiveGhost'
import { Guides } from '../../fixed/guides/Guides'
import { InspectorPosition } from '../../fixed/InspectorPosition'
import { Zoom } from '../../fixed/Zoom'
import { InspectorPanel } from '../Inspector/InspectorPanel'
import {
  InspectorAttributes,
  InspectorBody,
  InspectorCategory,
  InspectorClassInput,
  InspectorClassList,
  InspectorControl,
  InspectorEmpty,
  InspectorHeader,
  InspectorSection,
  InspectorVariants,
} from '../Inspector/InspectorParts'
import { LayersPanel } from '../Layers/LayersPanel'
import { LayerRow } from '../Layers/LayerRow'
import {
  LayersCount,
  LayersEmpty,
  LayersHeader,
  LayersSearch,
  LayersTitle,
  LayersTree,
} from '../Layers/LayersParts'
import { Palette, PaletteGrid, PaletteHeader, PaletteItem } from '../Palette/Palette'
import { EditorProvider, type EditorProviderProps } from './EditorProvider'
import { HistoryGroup, HistoryRedo, HistoryUndo } from './HistoryParts'
import { useEditorShortcuts } from './useEditorShortcuts'
import styles from './HtmlEditor.module.css'

export type HtmlEditorProps = EditorProviderProps & {
  className?: string
}

export function HtmlEditor({ className, children, ...providerProps }: HtmlEditorProps) {
  return (
    <EditorProvider {...providerProps}>
      <EditorShell className={className}>{children}</EditorShell>
    </EditorProvider>
  )
}

function EditorShell({ className, children }: { className?: string; children: ReactNode }) {
  const shellRef = useRef<HTMLDivElement | null>(null)
  useEditorShortcuts(shellRef)

  return (
    <div
      ref={shellRef}
      className={
        className ? `adt-editor ${styles.shell} ${className}` : `adt-editor ${styles.shell}`
      }
    >
      {children}
    </div>
  )
}

export type DefaultLayoutProps = Omit<EditorProviderProps, 'children'> & {
  className?: string
}

function DefaultLayout({ className, ...providerProps }: DefaultLayoutProps) {
  return (
    <HtmlEditor {...providerProps} className={className}>
      <Layout>
        <div className={styles.left}>
          <Palette />
          <LayersPanel className={styles.layers} />
        </div>
        <Canvas className={styles.canvas} />
        <InspectorPanel className={styles.inspector} />
      </Layout>
    </HtmlEditor>
  )
}

function Layout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className ? `${styles.threePane} ${className}` : styles.threePane}>
      {children}
    </div>
  )
}

const LayersNamespace = Object.assign(LayersPanel, {
  Header: LayersHeader,
  Title: LayersTitle,
  Count: LayersCount,
  Search: LayersSearch,
  Tree: LayersTree,
  Row: LayerRow,
  Empty: LayersEmpty,
})

const CanvasNamespace = Object.assign(Canvas, {
  Toolbar: CanvasToolbar,
  WidthPresets: CanvasWidthPresets,
  DarkToggle: CanvasDarkToggle,
  Viewport: CanvasViewport,
  FixedPage: CanvasFixedPage,
  Zoom,
  Guides,
  LiveGhost,
  ImageGhost,
})

const InspectorNamespace = Object.assign(InspectorPanel, {
  Header: InspectorHeader,
  Empty: InspectorEmpty,
  Variants: InspectorVariants,
  Body: InspectorBody,
  Section: InspectorSection,
  ClassInput: InspectorClassInput,
  ClassList: InspectorClassList,
  Category: InspectorCategory,
  Control: InspectorControl,
  Attributes: InspectorAttributes,
  Position: InspectorPosition,
})

const HistoryNamespace = Object.assign(HistoryGroup, {
  Undo: HistoryUndo,
  Redo: HistoryRedo,
})

const PaletteNamespace = Object.assign(Palette, {
  Header: PaletteHeader,
  Grid: PaletteGrid,
  Item: PaletteItem,
})

HtmlEditor.Layers = LayersNamespace
HtmlEditor.Canvas = CanvasNamespace
HtmlEditor.Inspector = InspectorNamespace
HtmlEditor.Palette = PaletteNamespace
HtmlEditor.History = HistoryNamespace
HtmlEditor.Layout = Layout
HtmlEditor.DefaultLayout = DefaultLayout
