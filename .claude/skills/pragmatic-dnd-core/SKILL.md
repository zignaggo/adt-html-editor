---
name: pragmatic-dnd-core
description: Core API of @atlaskit/pragmatic-drag-and-drop (Pragmatic drag and drop / pdnd). Use whenever implementing or debugging drag and drop with this library in ANY framework or vanilla JS — draggable elements, drop targets, monitors, drag events, file/text/URL drops from outside the window, text selection drags, array reordering, drag previews, nested drop targets, stickiness, or typing drag data. Also use for questions about pdnd entry points, imports, event ordering, or why a drop target / draggable isn't firing.
---

# Pragmatic drag and drop — Core package

```bash
yarn add @atlaskit/pragmatic-drag-and-drop
# or: npm install @atlaskit/pragmatic-drag-and-drop
```

Framework-agnostic (vanilla TS) library built on the browser's native drag and drop. Everything is imported from **entry points** — never from the package root:

```ts
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { dropTargetForExternal, monitorForExternal } from '@atlaskit/pragmatic-drag-and-drop/external/adapter';
import { dropTargetForTextSelection, monitorForTextSelection } from '@atlaskit/pragmatic-drag-and-drop/text-selection/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import { once } from '@atlaskit/pragmatic-drag-and-drop/once';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
```

## Mental model

An **adapter** teaches pdnd how to handle dragging one entity type:

- **element adapter** → dragging DOM elements (lists, boards, grids, resizing). Provides `draggable()`, `dropTargetForElements()`, `monitorForElements()`.
- **text selection adapter** → dragging selected text. Provides `dropTargetForTextSelection()`, `monitorForTextSelection()` (no `draggable` — the user selects text themselves).
- **external adapter** → drags that start outside the window (files, text/URLs from other apps or windows/iframes). Provides `dropTargetForExternal()`, `monitorForExternal()` (no `draggable`).

**Drop targets** are elements that can be dropped on. **Monitors** listen to drag events anywhere, not tied to an element. Every registration function returns a `CleanupFn` — call it to unbind (use `combine()` to merge several).

## Minimal element example

```ts
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

const cleanup = combine(
  draggable({
    element: cardEl,
    getInitialData: () => ({ type: 'card', cardId: card.id }),
  }),
  dropTargetForElements({
    element: columnEl,
    getData: () => ({ columnId: column.id }),
    canDrop: ({ source }) => source.data.type === 'card',
    onDrop: ({ source, self, location }) => {
      // source.data → data from the draggable
      // self.data → this drop target's data
      // location.current.dropTargets → bubble-ordered (innermost first)
    },
  }),
);
```

## Rules that prevent most bugs

- One `draggable` per element; one drop target **per entity type** per element (a warning is logged otherwise). The same element CAN host e.g. `dropTargetForElements` + `dropTargetForExternal`.
- The `element` is the identity key. Removing and re-adding a draggable/drop target on the same element mid-drag is safe — pdnd treats it as the same entity (reconciliation). Monitors have no key; every call creates a new monitor.
- Drop targets can be nested; the lookup goes from the deepest element upwards (bubble order). `canDrop() === false` skips that target but the upward search continues.
- `getData()`, `canDrop()`, `getDropEffect()`, `getIsSticky()` are called repeatedly during a drag — keep them pure/cheap (wrap expensive work with `once`). `canMonitor()` is called only once, at drag start.
- Event order is always: drag source → drop targets (innermost → outermost) → monitors (creation order).
- Data is typed `Record<string | symbol, unknown>` on purpose. Validate before using (type-guard helper or zod). See references/utilities-and-typing.md.
- `onDrop` fires however the drag ends (drop, cancel, error). The platform can't tell you *how* it ended — inspect `location.current.dropTargets` (empty array = not dropped on any target).

## Events (quick reference)

| Event | When |
|---|---|
| `onGenerateDragPreview` | Drag about to start; DOM changes here appear in the preview |
| `onDragStart` | Drag started; DOM changes here do NOT appear in the preview |
| `onDrag` | Throttled (~60fps) position updates |
| `onDropTargetChange` | Drop target hierarchy changed |
| `onDragEnter` / `onDragLeave` | Drop-target-only, derived from `onDropTargetChange` |
| `onDrop` | Drag finished (any reason) |

External adapter differences: no `onGenerateDragPreview`; drop targets get no `onDragStart` (use a monitor to know when a file enters the window). External data (`source.items`) is **only readable inside `onDrop`** — before that you can only see the types being dragged.

## Reference files — read before implementing the matching feature

- `references/element-adapter.md` — full `draggable` API (dragHandle, canDrag, getInitialData, getInitialDataForExternal), drag previews (`setCustomNativeDragPreview`, offsets, `pointerOutsideOfPreview`, `disableNativeDragPreview`), element adapter types.
- `references/drop-targets.md` — all drop target arguments, `getDropEffect`, stickiness algorithm with scenarios, nested drop target resolution, handling `onDrop` with nesting.
- `references/monitors-and-events.md` — `canMonitor`, monitor lifecycle gotchas, full event flow/ordering scenarios, `DragLocationHistory` payload shapes, cancel flow.
- `references/external-and-text-selection.md` — files/text/URL/HTML helpers (`containsFiles`, `getFiles`, `getText`, `some`...), iframe/cross-domain constraints, text selection payloads.
- `references/utilities-and-typing.md` — `combine`, `once`, `reorder`, `preventUnhandled`, shared types entry point, and the recommended patterns for strongly typing `data` (symbol key type guards, zod), isolating experiences with `type` fields, virtualization guidance.
