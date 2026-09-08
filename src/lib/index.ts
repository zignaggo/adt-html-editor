import './styles/base.css'

export { HtmlEditor } from './components/Editor/HtmlEditor'
export type { HtmlEditorProps, DefaultLayoutProps } from './components/Editor/HtmlEditor'
export { EditorProvider } from './components/Editor/EditorProvider'
export { useEditorShortcuts } from './components/Editor/useEditorShortcuts'
export { HistoryGroup, HistoryUndo, HistoryRedo } from './components/Editor/HistoryParts'
export type { HistoryProps, HistoryButtonProps } from './components/Editor/HistoryParts'
export { useHistory } from './components/Editor/useHistory'
export type { HistoryApi } from './components/Editor/useHistory'
export { useKeyboardMove } from './components/Editor/useKeyboardMove'
export type { KeyboardMove } from './components/Editor/useKeyboardMove'
export { resolveKeyboardMove, MOVE_KEYS } from './core/keyboardMove'
export type { MoveDirection } from './core/keyboardMove'
export type { EditorProviderProps, HtmlEditorHandle } from './components/Editor/EditorProvider'

export { LayersPanel } from './components/Layers/LayersPanel'
export type { LayersPanelProps } from './components/Layers/LayersPanel'
export {
  LayersCount,
  LayersEmpty,
  LayersHeader,
  LayersTitle,
  LayersTree,
} from './components/Layers/LayersParts'
export type { LayersTreeProps } from './components/Layers/LayersParts'
export { LayerRow } from './components/Layers/LayerRow'
export { useLayerRow } from './components/Layers/useLayerRow'
export type {
  LayerRow as LayerRowApi,
  LayerRowAria,
  LayerRowChevron,
  UseLayerRowOptions,
} from './components/Layers/useLayerRow'
export type { LayerRowProps } from './components/Layers/LayerRow'
export { LayerLabel } from './components/Layers/LayerLabel'
export { flattenTree } from './components/Layers/flatten'
export type { LayerRowInfo } from './components/Layers/flatten'
export { useLayersContext } from './components/Layers/context'

export { Canvas } from './components/Canvas/Canvas'
export type { CanvasProps } from './components/Canvas/Canvas'
export {
  CanvasDarkToggle,
  CanvasToolbar,
  CanvasViewport,
  CanvasWidthPresets,
} from './components/Canvas/CanvasParts'
export { CanvasNode } from './components/Canvas/CanvasNode'
export { SelectionOverlay } from './components/Canvas/SelectionOverlay'
export { DEFAULT_WIDTH_PRESETS, useCanvasContext } from './components/Canvas/context'
export type { CanvasWidthPreset } from './components/Canvas/context'

export { InspectorPanel } from './components/Inspector/InspectorPanel'
export type { InspectorPanelProps } from './components/Inspector/InspectorPanel'
export {
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
} from './components/Inspector/InspectorParts'
export type { InspectorControlProps } from './components/Inspector/InspectorParts'
export { useInspectorContext } from './components/Inspector/context'
export { useClassEditing, matchesRoot } from './components/Inspector/useClassEditing'
export type { ClassEditing } from './components/Inspector/useClassEditing'
export { useStyleControl } from './components/Inspector/controls/useStyleControl'
export type { StyleControl, StyleControlSpec } from './components/Inspector/controls/useStyleControl'
export { ControlGroup } from './components/Inspector/controls/ControlGroup'
export type { ControlGroupProps } from './components/Inspector/controls/ControlGroup'
export { ClassChips } from './components/Inspector/ClassChips'
export type { ClassChipsProps } from './components/Inspector/ClassChips'
export { ClassCombobox } from './components/Inspector/ClassCombobox'
export type { ClassComboboxProps } from './components/Inspector/ClassCombobox'
export { CATEGORIES, COLOR_SWATCHES, PALETTE_COLORS, VARIANTS } from './tailwind/categories'
export type { CategorySpec, ControlSpec, VariantId } from './tailwind/categories'

export { Palette, PaletteGrid, PaletteHeader, PaletteItem } from './components/Palette/Palette'
export type { PaletteProps } from './components/Palette/Palette'
export { usePaletteDraggable } from './components/Palette/usePaletteDraggable'
export type { PaletteDraggable } from './components/Palette/usePaletteDraggable'
export { PALETTE_ENTRIES } from './components/Palette/templates'
export type { PaletteEntry } from './components/Palette/templates'

export { DropIndicator } from './dnd/DropIndicator'
export { useNodeDraggable } from './dnd/useNodeDraggable'
export { useTreeDropTarget, INDENT_PER_LEVEL } from './dnd/useTreeDropTarget'
export { useCanvasDropTarget } from './dnd/useCanvasDropTarget'
export type { DragTargetRef } from './dnd/resolveTarget'

export {
  useEditor,
  useEditorSelector,
  useEditorStoreApi,
  useNode,
  useChildren,
  useDocument,
  useRootId,
  useIsSelected,
  useIsCollapsed,
  useCanUndo,
  useCanRedo,
} from './components/Editor/context'
export type { EditorApi, StyleMode } from './components/Editor/context'

export { parseHtml, looksLikeFullDocument } from './core/html/parse'
export { serializeHtml } from './core/html/serialize'
export { createEditorStore } from './core/store'
export { COALESCE_WINDOW_MS, HISTORY_LIMIT } from './core/history'
export type { History, HistoryEntry, Snapshot } from './core/history'
export type {
  DropPosition,
  EditorActions,
  EditorState,
  EditorStore,
  NodeTemplate,
} from './core/store'

export type { NodeId } from './core/ids'
export type {
  AnyNode,
  CommentNode,
  EditorDocument,
  ElementNode,
  Envelope,
  OpaqueNode,
  StyledNode,
  TextNode,
} from './core/model'
