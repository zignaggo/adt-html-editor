import { useRef, type ReactNode } from 'react'
import { CanvasFixedPage } from '../../../lib/components/Canvas/Canvas'
import { CanvasContextMenu } from '../../../lib/components/Canvas/menu/CanvasContextMenu'
import { CanvasViewport } from '../../../lib/components/Canvas/CanvasParts'
import { EditorProvider, type EditorProviderProps } from '../../../lib/components/Editor/EditorProvider'
import { useEditorShortcuts } from '../../../lib/components/Editor/useEditorShortcuts'
import { ImageGhost } from '../../../lib/fixed/ghost/ImageGhost'
import { LiveGhost } from '../../../lib/fixed/ghost/LiveGhost'
import { Guides } from '../../../lib/fixed/guides/Guides'
import { Handles, HandlesResize, HandlesRotate } from '../../../lib/fixed/transform/Handles'
import { cn } from '../../lib/utils'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../ui/resizable'
import { TooltipProvider } from '../../ui/tooltip'
import {
  Canvas,
  CanvasDarkToggle,
  CanvasModeToggle,
  CanvasDock,
  CanvasToolbar,
  CanvasWidthPresets,
  CanvasZoom,
} from '../Canvas/CanvasParts'
import {
  InspectorAttributes,
  InspectorBody,
  InspectorCategory,
  InspectorClassInput,
  InspectorClassList,
  InspectorControl,
  InspectorEmpty,
  InspectorHeader,
  InspectorPanel,
  InspectorSection,
  InspectorVariants,
} from '../Inspector/InspectorParts'
import { InspectorPosition } from '../Inspector/InspectorPosition'
import { InspectorTransform } from '../Inspector/InspectorTransform'
import { TagInspectorHeader } from '../Inspector/TagInspectorHeader'
import { WrapInContainer } from '../Canvas/WrapInContainer'
import { TagPicker } from '../Inspector/TagPicker'
import { InspectorAppearance } from '../Inspector/sections/InspectorAppearance'
import { InspectorBorders } from '../Inspector/sections/InspectorBorders'
import { InspectorLayout } from '../Inspector/sections/InspectorLayout'
import { InspectorSizing } from '../Inspector/sections/InspectorSizing'
import { InspectorSpacing } from '../Inspector/sections/InspectorSpacing'
import { InspectorStyles } from '../Inspector/sections/InspectorStyles'
import { InspectorTypography } from '../Inspector/sections/InspectorTypography'
import {
  LayerRow,
  LayersCount,
  LayersEmpty,
  LayersHeader,
  LayersPanel,
  LayersSearch,
  LayersTitle,
  LayersTree,
} from '../Layers/LayersParts'
import { Palette, PaletteGrid, PaletteHeader, PaletteItem } from '../Palette/Palette'
import { BoxSizeControls } from '../../../lib/flow/box/BoxSizeControls'
import { TagControls } from '../../../lib/flow/tags/TagControls'
import { FlowControls } from '../../../lib/flow/FlowControls'
import { FlowStatusBar } from '../../../lib/flow/FlowStatusBar'
import { FlowTransformSection } from '../../../lib/flow/transform/FlowTransformSection'
import { FlowToolbar } from '../../../lib/flow/FlowToolbar'
import { Sidebar, SidebarLayers, SidebarPalette, SidebarSearch, SidebarTabs } from '../Sidebar/Sidebar'
import { HistoryGroup, HistoryRedo, HistoryUndo } from './HistoryParts'
import { Topbar, TopbarEnd, TopbarStart, TopbarTitle } from './Topbar'

export type HtmlEditorProps = EditorProviderProps & {
  className?: string
}

export function HtmlEditor({ className, children, ...providerProps }: HtmlEditorProps) {
  return (
    <EditorProvider {...providerProps}>
      <EditorShell className={className}>
        <TooltipProvider>{children}</TooltipProvider>
      </EditorShell>
    </EditorProvider>
  )
}

function EditorShell({ className, children }: { className?: string; children: ReactNode }) {
  const shellRef = useRef<HTMLDivElement | null>(null)
  useEditorShortcuts(shellRef)
  return (
    <div
      ref={shellRef}
      className={cn('adt-editor isolate flex h-full min-h-0 min-w-0 bg-background text-sm text-foreground antialiased', className)}
    >
      {children}
    </div>
  )
}

export function Layout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid min-h-0 w-full grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(260px,300px)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export type DefaultLayoutProps = Omit<EditorProviderProps, 'children'> & {
  className?: string
  title?: ReactNode
  actions?: ReactNode
  topbar?: boolean
  sidebar?: ReactNode
  canvas?: ReactNode
  inspector?: ReactNode
}

export function DefaultLayout({
  className,
  title,
  actions,
  topbar = true,
  sidebar,
  canvas,
  inspector,
  ...providerProps
}: DefaultLayoutProps) {
  return (
    <HtmlEditor {...providerProps} className={cn('flex-col', className)}>
      {topbar ? <Topbar title={title} actions={actions} /> : null}
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={22} minSize={16} className="flex min-h-0 flex-col">
          <Sidebar className="min-h-0 flex-1 border-r-0">{sidebar}</Sidebar>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={54} minSize={30} className="flex min-h-0 min-w-0 flex-col">
          <Canvas className="min-h-0 flex-1">{canvas}</Canvas>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={24} minSize={18} className="flex min-h-0 flex-col">
          <InspectorPanel className="min-h-0 flex-1 border-l-0">{inspector}</InspectorPanel>
        </ResizablePanel>
      </ResizablePanelGroup>
    </HtmlEditor>
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

const HandlesNamespace = Object.assign(Handles, {
  Resize: HandlesResize,
  Rotate: HandlesRotate,
})

const CanvasNamespace = Object.assign(Canvas, {
  Toolbar: CanvasToolbar,
  Dock: CanvasDock,
  ModeToggle: CanvasModeToggle,
  WidthPresets: CanvasWidthPresets,
  DarkToggle: CanvasDarkToggle,
  Viewport: CanvasViewport,
  ContextMenu: CanvasContextMenu,
  FixedPage: CanvasFixedPage,
  Zoom: CanvasZoom,
  Guides,
  LiveGhost,
  ImageGhost,
  Handles: HandlesNamespace,
  FlowControls,
  FlowStatusBar,
  FlowToolbar,
  BoxSize: BoxSizeControls,
  TagControls,
  WrapInContainer,
})

const InspectorNamespace = Object.assign(InspectorPanel, {
  Header: InspectorHeader,
  TagHeader: TagInspectorHeader,
  TagPicker,
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
  Transform: InspectorTransform,
  FlowPosition: FlowTransformSection,
  Styles: InspectorStyles,
  Layout: InspectorLayout,
  Spacing: InspectorSpacing,
  Sizing: InspectorSizing,
  Typography: InspectorTypography,
  Appearance: InspectorAppearance,
  Borders: InspectorBorders,
})

const TopbarNamespace = Object.assign(Topbar, {
  Start: TopbarStart,
  Title: TopbarTitle,
  End: TopbarEnd,
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

const SidebarNamespace = Object.assign(Sidebar, {
  Search: SidebarSearch,
  Tabs: SidebarTabs,
  Layers: SidebarLayers,
  Palette: SidebarPalette,
})

HtmlEditor.Layers = LayersNamespace
HtmlEditor.Canvas = CanvasNamespace
HtmlEditor.Inspector = InspectorNamespace
HtmlEditor.Palette = PaletteNamespace
HtmlEditor.Sidebar = SidebarNamespace
HtmlEditor.Topbar = TopbarNamespace
HtmlEditor.History = HistoryNamespace
HtmlEditor.Layout = Layout
HtmlEditor.DefaultLayout = DefaultLayout
