import type { ComponentType } from 'react'
import { CanvasOnlyLayout } from './compositions/CanvasOnlyLayout'
import { CustomLayout } from './compositions/CustomLayout'
import { FixedImageLayout } from './compositions/FixedImageLayout'
import { FixedLiveLayout } from './compositions/FixedLiveLayout'
import { FixedTransformLayout } from './compositions/FixedTransformLayout'
import { FlowControlsLayout } from './compositions/FlowControlsLayout'
import { FlowInspectorLayout } from './compositions/FlowInspectorLayout'
import { FixedImageCanvas } from './compositions/FixedImageCanvas'
import { FlowCanvas } from './compositions/FlowCanvas'
import { LayersCanvasLayout } from './compositions/LayersCanvasLayout'
import { LayersOnlyLayout } from './compositions/LayersOnlyLayout'
import { PaletteLayout } from './compositions/PaletteLayout'
import type { FixtureId } from './fixtures'

export const GROUPS = ['Panels', 'Flow layout', 'Fixed layout', 'HTML contract'] as const

export type ScenarioGroup = (typeof GROUPS)[number]

export type Scenario = {
  id: string
  group: ScenarioGroup
  label: string
  summary: string
  tryIt: string[]
  fixture: FixtureId
  skin: 'core' | 'shadcn'
  layout?: 'auto' | 'flow' | 'fixed'
  directControls?: boolean
  Full?: ComponentType
  FullCanvas?: ComponentType
  Minimal?: ComponentType
  doc?: string
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'default',
    group: 'Panels',
    label: 'Default layout',
    summary:
      'The whole editor: top bar, a sidebar that merges layers and palette, a canvas with a floating dock, and the style inspector.',
    tryIt: [
      'Switch between the Layers and Palette tabs',
      'Change the breakpoint from the dock under the canvas',
      'Open the Typography and Spacing sections',
    ],
    fixture: 'landing',
    skin: 'shadcn',
    doc: 'shadcn-skin',
  },
  {
    id: 'core-chrome',
    group: 'Panels',
    label: 'Built-in chrome',
    summary:
      "The same editor from the main entry point, styled by the library's own stylesheet instead of your shadcn/ui components.",
    tryIt: [
      'Drag a block from the palette onto the canvas',
      'Click an element and edit it from the inspector',
      'Undo with Ctrl/Cmd+Z',
    ],
    fixture: 'landing',
    skin: 'core',
    doc: 'composition',
  },
  {
    id: 'custom',
    group: 'Panels',
    label: 'Custom composition',
    summary:
      'Panels rearranged, a custom tree row, a custom palette and two inspector controls of our own.',
    tryIt: [
      'Notice the tree rows and palette cards are app code, not library chrome',
      'Use the radius slider under "Custom controls"',
      'Type a class in the dashed input and press Enter',
    ],
    fixture: 'landing',
    skin: 'core',
    Full: CustomLayout,
    Minimal: CustomLayout,
    doc: 'composition',
  },
  {
    id: 'layers',
    group: 'Panels',
    label: 'Layers and search',
    summary: 'The tree on its own: filtering, keyboard navigation and drag to reorder.',
    tryIt: [
      'Search for .flex, #hero or a word of text',
      'Move with the arrow keys and reorder with Alt+Up / Alt+Down',
      'Drag a row onto another one',
    ],
    fixture: 'landing',
    skin: 'shadcn',
    Minimal: LayersOnlyLayout,
    doc: 'composition',
  },
  {
    id: 'palette',
    group: 'Panels',
    label: 'Palette and drop zones',
    summary: 'A palette and an empty canvas, to watch where each drop lands.',
    tryIt: [
      'Drop a block in the middle of a container to nest it',
      'Drop near an edge to insert a sibling',
      'Drop in the gap between two children',
    ],
    fixture: 'empty',
    skin: 'shadcn',
    Minimal: PaletteLayout,
    doc: 'drop-zones',
  },
  {
    id: 'menu',
    group: 'Panels',
    label: 'Context menu',
    summary: 'The canvas on its own: the viewport renders the menu, nothing else is wired.',
    tryIt: [
      'Right-click an element',
      'Shift-click a second one and right-click the selection',
      'Copy style on one element and paste it onto another',
    ],
    fixture: 'landing',
    skin: 'shadcn',
    Minimal: CanvasOnlyLayout,
    doc: 'context-menu',
  },
  {
    id: 'flow-direct',
    group: 'Flow layout',
    label: 'Direct controls',
    summary:
      'Canvas only, with directControls on: handles, floating toolbar and status bar edit the page in place.',
    tryIt: [
      'Drag a corner handle to resize between 10% and 100%',
      'Drag the amber handle to set the space below',
      'Open the Layout menu in the floating toolbar',
    ],
    fixture: 'flow-layout',
    skin: 'shadcn',
    layout: 'flow',
    directControls: true,
    FullCanvas: FlowCanvas,
    Minimal: FlowControlsLayout,
    doc: 'flow-controls',
  },
  {
    id: 'flow-inspector',
    group: 'Flow layout',
    label: 'Inspector only',
    summary: 'The same page with directControls off: every edit goes through the inspector.',
    tryIt: [
      'Select a block and change its width in the inspector',
      'Switch breakpoint in the variant bar and write a mobile override',
      'Compare it with the direct-controls scenario',
    ],
    fixture: 'flow-layout',
    skin: 'shadcn',
    layout: 'flow',
    Minimal: FlowInspectorLayout,
    doc: 'flow-controls',
  },
  {
    id: 'fixed-live',
    group: 'Fixed layout',
    label: 'Live ghost',
    summary: 'The fixed page with smart guides and the default live ghost, nothing else.',
    tryIt: [
      'Drag an element and watch it snap to the guides',
      'Hold Alt to drop snapping',
      'Nudge with the arrow keys (Shift = 10 px)',
    ],
    fixture: 'fixed-inline',
    skin: 'shadcn',
    layout: 'fixed',
    Minimal: FixedLiveLayout,
    doc: 'fixed-layout',
  },
  {
    id: 'fixed-image',
    group: 'Fixed layout',
    label: 'Image ghost',
    summary:
      'The same page with the other ghost strategy: the native drag preview plus an outline on the destination.',
    tryIt: [
      'Drag an element and compare the preview with the live ghost',
      'Drop it and check the guides it snapped to',
      'Zoom to 200% and drag again',
    ],
    fixture: 'fixed-inline',
    skin: 'shadcn',
    layout: 'fixed',
    FullCanvas: FixedImageCanvas,
    Minimal: FixedImageLayout,
    doc: 'fixed-layout',
  },
  {
    id: 'fixed-transform',
    group: 'Fixed layout',
    label: 'Resize and rotate',
    summary:
      'The handles and the position and transform sections of the inspector, over a page that already has rotations.',
    tryIt: [
      'Drag a corner with Shift to keep the aspect ratio',
      'Rotate and hold Shift to snap to 15 degrees',
      'Press [ and ] to rotate by 1 degree',
    ],
    fixture: 'fixed-rotated',
    skin: 'shadcn',
    layout: 'fixed',
    Minimal: FixedTransformLayout,
    doc: 'fixed-layout',
  },
  {
    id: 'fixed-css',
    group: 'Fixed layout',
    label: 'Positions from a stylesheet',
    summary: 'The same page with the positions in the head stylesheet instead of inline.',
    tryIt: [
      'Drag an element: the position is written inline on drop',
      'Zoom to 50% and 200% and drag again',
      'Check that the rest of the stylesheet is untouched',
    ],
    fixture: 'fixed-css',
    skin: 'shadcn',
    layout: 'fixed',
    Minimal: FixedLiveLayout,
    doc: 'fixed-layout',
  },
  {
    id: 'full-document',
    group: 'HTML contract',
    label: 'Full document',
    summary: 'Doctype, html attributes and the whole head are opaque; only the body is edited.',
    tryIt: [
      'Edit the body and run the round-trip check in the playground',
      'Confirm the head comes out identical',
      'Read the output under the editor',
    ],
    fixture: 'full',
    skin: 'shadcn',
    Minimal: CanvasOnlyLayout,
    doc: 'html-contract',
  },
  {
    id: 'tricky',
    group: 'HTML contract',
    label: 'Opaque nodes and oddities',
    summary:
      'Comments, entities, custom elements and script/style/svg in the tree, re-emitted byte for byte.',
    tryIt: [
      'Find the opaque nodes in the tree',
      'Move one of them and check the output',
      'Notice they take no children',
    ],
    fixture: 'tricky',
    skin: 'shadcn',
    Minimal: LayersCanvasLayout,
    doc: 'html-contract',
  },
]

export const SCENARIO_BY_ID = Object.fromEntries(
  SCENARIOS.map((scenario) => [scenario.id, scenario]),
) as Record<string, Scenario>

export function scenariosOf(group: ScenarioGroup): Scenario[] {
  return SCENARIOS.filter((scenario) => scenario.group === group)
}
