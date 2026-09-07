# Monitors and events

## Monitors

Global listeners, not tied to an element. Exposed per adapter: `monitorForElements`, `monitorForExternal`, `monitorForTextSelection`.

```ts
const cleanup = monitorForElements({
  canMonitor: ({ source }) => source.data.type === 'card',
  onDragStart: () => console.log('a card drag started'),
});
```

- `canMonitor({ initial, source })` is called ONCE per drag, at drag start (or at creation if the monitor is created mid-drag, with the initial values). All monitors in a drag receive the same feedback args. For dynamic conditions, filter inside the event handlers instead.
- Monitors have no identity key: every call creates a new monitor, even with the same args object. Monitor order = creation order; safe assumption is only "monitors run last".
- A monitor added during an event will not be called for the current event (prevents infinite loops), only subsequent ones.

## Event ordering

For every event: 1) drag source (`draggable`) if relevant → 2) drop targets, innermost upwards (bubble) → 3) monitors in creation order.

## Events

- `onGenerateDragPreview` — drag about to start; DOM changes ARE captured in the preview. Payload adds `nativeSetDragImage` (prefer `setCustomNativeDragPreview`).
- `onDragStart` — drag started; DOM changes are NOT captured in the preview.
- `onDrag` — throttled via `requestAnimationFrame` (~60/s), current input/position.
  - Fires on the *current* drop targets. To hear all `onDrag` events from the *initial* targets, use a monitor.
- `onDropTargetChange` — the drop target hierarchy changed. Fires on the source, then on all PREVIOUS targets (bubble order), then on NEW current targets (bubble order), then monitors.
  - Derived, drop-target-only: `onDragEnter` when this target becomes entered, `onDragLeave` when it exits. They ride along `onDropTargetChange`; a parent wanting to know about child changes must use `onDropTargetChange`.
- `onDrop` — drag finished for ANY reason (explicit drop, cancel, error recovery). The platform cannot distinguish "cancel" vs "dropped nowhere" vs "dropped externally" — only `location.current.dropTargets` is reliable (final targets; `[]` means none). Fires on source, then all current targets, then monitors.

### Cancel flow

Cancelling while over `[B, A]`:

1. `onDropTargetChange` on source → B (`onDragLeave`) → A (`onDragLeave`) → monitors
2. `onDrop` on source → monitors (NOT on B/A — no longer dragged over)

## Shared payload

```ts
import { Input, DragLocation, DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';

type Input = {
  altKey: boolean; button: number; buttons: number;
  ctrlKey: boolean; metaKey: boolean; shiftKey: boolean;
  clientX: number; clientY: number; pageX: number; pageY: number;
};

type DragLocation = {
  input: Input;
  dropTargets: DropTargetRecord[]; // bubble ordered, innermost first
};

type DragLocationHistory = {
  initial: DragLocation;   // where the drag started
  current: DragLocation;   // where the user is now
  previous: Pick<DragLocation, 'dropTargets'>; // current from the previous event
  // Exception: onGenerateDragPreview/onDragStart have identical current & previous
};
```

Every event payload = `{ location: DragLocationHistory, source: <adapter payload> }`; drop targets add `self: DropTargetRecord`.

## External drag lifecycle

For external entities (files, etc.), the drag "starts" when it first enters the window and "finishes" when it leaves the window (or drops). This keeps every entity type on the same event lifecycle.
