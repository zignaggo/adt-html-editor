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
  LayersSearch,
  LayersTitle,
  LayersTree,
} from './components/Layers/LayersParts'
export type { LayersSearchProps, LayersTreeProps } from './components/Layers/LayersParts'
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
export { createLayerFilter, flattenTree, siblingsOf } from './components/Layers/flatten'
export { contentChildrenOf, isLayoutWhitespace, labelOf } from './core/model'
export type { LayerFilter, LayerRowInfo } from './components/Layers/flatten'
export { useLayersContext } from './components/Layers/context'
export type {
  LayersActions,
  LayersContextValue,
  LayersMeta,
  LayersState,
} from './components/Layers/context'

export { Canvas, CanvasFixedPage } from './components/Canvas/Canvas'
export type { CanvasProps } from './components/Canvas/Canvas'
export type { FixedPageProps } from './fixed/FixedPage'
export { Zoom as CanvasZoom } from './fixed/Zoom'
export { DEFAULT_ZOOM_LEVELS } from './fixed/zoomLevels'
export type { CanvasZoomLevel } from './fixed/zoomLevels'
export { Guides as CanvasGuides } from './fixed/guides/Guides'
export { LiveGhost as CanvasLiveGhost } from './fixed/ghost/LiveGhost'
export { createLiveStrategy } from './fixed/ghost/liveStrategy'
export { ImageGhost as CanvasImageGhost } from './fixed/ghost/ImageGhost'
export { createImageStrategy } from './fixed/ghost/imageStrategy'
export { useCanvasInteractions } from './components/Canvas/useCanvasInteractions'
export type { CanvasInteractions } from './components/Canvas/useCanvasInteractions'
export { createOutlineStrategy } from './fixed/ghost/strategy'
export type { GhostStrategy } from './fixed/ghost/strategy'
export { InspectorPosition } from './fixed/InspectorPosition'
export { detectLayout, pageSizeOf, readViewportMeta } from './fixed/detect'
export type { PageSize } from './fixed/detect'
export { pageContainerOf } from './fixed/pageContainer'
export { snapWithGuides } from './fixed/guides/computeGuides'
export type { Guide } from './fixed/guides/computeGuides'
export { positionDeclarations, readDeclaredPosition, sizeDeclarations } from './fixed/position'
export { useFixedDraggable } from './fixed/useFixedDraggable'
export { subscribeFixedDrag, fixedDragSession } from './fixed/fixedDragStore'
export type { FixedDragSession } from './fixed/fixedDragStore'
export type { FixedLayoutOptions } from './components/Editor/EditorProvider'
export {
  CanvasDarkToggle,
  CanvasToolbar,
  CanvasViewport,
  CanvasWidthPresets,
} from './components/Canvas/CanvasParts'
export { CanvasNode } from './components/Canvas/CanvasNode'
export { CanvasStage, CanvasStageContent } from './components/Canvas/CanvasStage'
export type { CanvasStageProps } from './components/Canvas/CanvasStage'
export { useCanvasStage } from './components/Canvas/stage'
export type { CanvasStageSize } from './components/Canvas/stage'
export { SelectionOverlay } from './components/Canvas/SelectionOverlay'
export { DEFAULT_WIDTH_PRESETS, useCanvasContext } from './components/Canvas/context'
export type { CanvasWidthPreset, CanvasZoom as CanvasZoomValue } from './components/Canvas/context'

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
export { CATEGORIES, COLOR_SWATCHES, PALETTE_COLORS } from './tailwind/categories'
export type { CategorySpec, ControlSpec } from './tailwind/categories'
export * from './tailwind/variants'

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
  useIsAnchor,
  useSelectedId,
  useSelectedIds,
  useSelectionCount,
  selectSelectedId,
  selectSelectedIds,
  useIsCollapsed,
  useIsLocked,
  useLayoutMode,
  useFixedLayout,
  useCanUndo,
  useCanRedo,
  useBreakpoint,
} from './components/Editor/context'
export type {
  EditorApi,
  EditorSelectorOptions,
  FixedLayoutConfig,
  LayoutMode,
  StyleMode,
} from './components/Editor/context'

export {
  EMPTY_SELECTION,
  commonParentOf,
  normalizeSelection,
  sameSelection,
  sortByDocumentOrder,
} from './core/selection'

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
  PlaceManyOptions,
  PlaceOptions,
  PlaceUpdate,
  SelectOptions,
  TransactionOptions,
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
export { Handles as CanvasHandles, HandlesResize as CanvasHandlesResize, HandlesRotate as CanvasHandlesRotate } from './fixed/transform/Handles'
export type { HandlesProps as CanvasHandlesProps } from './fixed/transform/Handles'
export { InspectorTransform } from './fixed/InspectorTransform'
export { readLayoutBox, layoutOriginOf } from './fixed/transform/layoutBox'
export { parseTransform, rotationIn, withRotation } from './fixed/transform/transformValue'
export { resizeBox, snapResizeEdges } from './fixed/transform/resize'
export type { HandleId } from './fixed/transform/handleSpecs'
export { subscribeTransformGesture, transformGesture } from './fixed/transform/transformGestureStore'
export type { TransformGesture } from './fixed/transform/transformGestureStore'
export { useLayersSearch } from './components/Layers/useLayersSearch'
export type { LayersSearch as LayersSearchApi } from './components/Layers/useLayersSearch'
export type { LayersScrollerProps } from './components/Layers/LayersParts'
export { useDarkToggle, useWidthPresets } from './components/Canvas/useCanvasControls'
export type { DarkToggle, WidthPresets } from './components/Canvas/useCanvasControls'
export { useZoom } from './fixed/useZoom'
export type { ZoomControl } from './fixed/useZoom'
export { useVariantBar } from './components/Inspector/useVariantBar'
export type { VariantBar } from './components/Inspector/useVariantBar'
export { useClassSuggestions, suggestFor } from './components/Inspector/useClassSuggestions'
export { useAttributeFields } from './components/Inspector/useAttributeFields'
export type { AttributeField, AttributeFields as AttributeFieldsApi } from './components/Inspector/useAttributeFields'
export { usePositionFields } from './fixed/usePositionFields'
export type { PositionFields, StackingOrder } from './fixed/usePositionFields'
export { useTransformFields } from './fixed/useTransformFields'
export type { TransformFields } from './fixed/useTransformFields'
export { LayersProvider } from './components/Layers/LayersPanel'
export { InspectorProvider } from './components/Inspector/InspectorPanel'
export { CanvasProvider } from './components/Canvas/Canvas'
export { useClassMapControl } from './components/Inspector/controls/useClassMapControl'
export type { ClassMapControl, ClassMapOverride } from './components/Inspector/controls/useClassMapControl'
export { useOptionalFields } from './components/Inspector/controls/useOptionalFields'
export type { OptionalField, OptionalFields } from './components/Inspector/controls/useOptionalFields'
export { useComputedStyles } from './components/Inspector/controls/useComputedStyles'
export type { ComputedStyles } from './components/Inspector/controls/useComputedStyles'
export * from './tailwind/classMaps'
export { PALETTE_FAMILIES, KEYWORD_COLORS, hexFromToken, tokenFromHex } from './tailwind/palette'
export type { PaletteFamily, PaletteShade, KeywordColor } from './tailwind/palette'
export { alignName, lineHeightRatio, parsePx, rgbToHex, weightName } from './style/computed'
export { useNodeSummary } from './components/Inspector/useNodeSummary'
export type { NodeCrumb, NodeSummary } from './components/Inspector/useNodeSummary'
export { useSelectionSummary } from './components/Inspector/useSelectionSummary'
export type { SelectionSummary, SelectionTag } from './components/Inspector/useSelectionSummary'
export { rowsBetween } from './components/Layers/flatten'
export { copySubtree, copySubtrees, readClipboard } from './core/clipboard'
