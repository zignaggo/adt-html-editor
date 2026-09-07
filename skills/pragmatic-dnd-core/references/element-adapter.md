# Element adapter

```ts
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
```

Enables rich experiences: lists, boards, grids, resizing.

## `draggable(args)`

- `element: HTMLElement` (required) — the element to make draggable.
- `dragHandle?: Element` — child element that is the only grabbable part.
- `canDrag?: (args: GetFeedbackArgs) => boolean` — return `false` to block the drag. Caveat: blocking calls `event.preventDefault()`, which prevents ANY parent draggable from dragging too. If you want a parent to remain draggable, conditionally don't register `draggable()` on the child instead of using `canDrag`.
- `getInitialData?: (args) => Record<string, unknown>` — attach data once, as the drag starts. Read via `source.data` everywhere else.
- `getInitialDataForExternal?: (args) => { [mediaType]: string }` — attach native data (`"text/plain"`, `"text/uri-list"`, ...) for OTHER windows/applications. It does not trigger the external adapter in the same window, but does in iframes/other windows. Never expose private data — any app the user drops on can read it.
- Events: `onGenerateDragPreview`, `onDragStart`, `onDrag`, `onDropTargetChange`, `onDrop`.

```ts
type GetFeedbackArgs = {
  input: Input;             // user input as drag starts
  element: HTMLElement;
  dragHandle: Element | null;
};
```

Multiple URLs for external consumers:

```ts
import { formatURLsForExternal } from '@atlaskit/pragmatic-drag-and-drop/element/format-urls-for-external';
getInitialDataForExternal: () => ({ 'text/uri-list': formatURLsForExternal([url1, url2]) });
```

During a drag you may add draggables, remount the dragging draggable (treated as the same one — see reconciliation), change its dimensions (won't change the preview), or remove it (events stop firing on it; common with virtual lists).

## `dropTargetForElements(args)` / `monitorForElements(args)`

Standard drop target / monitor (see drop-targets.md and monitors-and-events.md). Default `dropEffect` for element drop targets is `"move"`; override with `getDropEffect()`.

## Drag previews

The drag preview is what the user drags around. Prefer **native previews**: rendered off the main thread and draggable between applications.

### `setCustomNativeDragPreview` (recommended)

Mounts a new element used as the preview photo, then cleans it up.

```ts
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';

draggable({
  element: myElement,
  onGenerateDragPreview: ({ nativeSetDragImage }) => {
    setCustomNativeDragPreview({
      render({ container }) {
        const preview = document.createElement('div');
        preview.textContent = 'My preview';
        container.appendChild(preview);
        // optionally return a cleanup function
      },
      nativeSetDragImage,
    });
  },
});
```

Positioning — `getOffset({ container }) => {x, y}` places the pointer relative to the preview. `{x: 0, y: 0}` = pointer at top-left (default). Negative values are not supported; values beyond the border-box are clamped. `getOffset` runs in the next microtask after `render` (so React 18 has time to render into the container).

Helper offset functions (same entry point family under `/element/`):

- `pointerOutsideOfPreview({ x, y })` — push the preview away from the pointer.
- `centerUnderPointer` — center the preview under the pointer.
- `preserveOffsetOnSource({ element, input })` — keep the pointer at the same relative position it had on the original element.

Other element utilities:

- `disableNativeDragPreview` — hide the native preview (for fully custom previews that you render yourself, or none).
- `scrollJustEnoughIntoView` — scroll the element just into view before the browser photographs it (useful with default previews).

When you disable the native preview, also use `preventUnhandled` (see utilities) to avoid the native "snap back" cancel animation.

## Element adapter types

```ts
import type {
  ElementDragPayload,                 // { element, dragHandle, data }
  ElementEventBasePayload,            // { location, source }
  ElementEventPayloadMap,
  ElementDropTargetEventBasePayload,  // base + { self: DropTargetRecord }
  ElementDropTargetEventPayloadMap,
  ElementGetFeedbackArgs,
  ElementDropTargetGetFeedbackArgs,   // { input, source, element }
  ElementMonitorGetFeedbackArgs,      // { initial, source }
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
```
