# Utilities, types, and typing "data"

All utilities are optional and replaceable.

## `combine`

Merges cleanup functions into one:

```ts
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

const cleanup = combine(
  draggable({ element: el }),
  dropTargetForElements({ element: el }),
  monitorForElements({ /* ... */ }),
);
cleanup(); // unbinds everything
```

## `once`

Memoizes a function to a single call — for expensive `getData()`:

```ts
import { once } from '@atlaskit/pragmatic-drag-and-drop/once';
dropTargetForExternal({ getData: once(getExpensiveData) });
```

## `reorder`

Immutable array reorder (returns a new array):

```ts
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
const next = reorder({ list: [A, B, C], startIndex: 0, finishIndex: 1 }); // [B, A, C]
```

## `preventUnhandled`

Allows "drop" even when no target accepts it — needed when (a) you disabled the native drag preview and want to suppress the cancel "snap back" animation, or (b) you want to stop the browser's default handling of external drops (e.g. opening a dropped file). Per-drag: call `start()` each drag; `stop()` re-enables defaults mid-drag.

```ts
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
monitorForExternal({ onDragStart: () => preventUnhandled.start() });
```

## Shared types entry point

```ts
import type {
  DropTargetRecord, Position, Input,
  DragLocation, DragLocationHistory,
  CleanupFn,
  AllDragTypes, MonitorArgs, BaseEventPayload, // mostly for package authors
} from '@atlaskit/pragmatic-drag-and-drop/types';
```

You rarely need these explicitly — inference and `typeof` usually suffice (`type CleanupFn = ReturnType<typeof draggable>`).

## Typing "data" (recommended patterns)

`getInitialData()` / `getData()` are deliberately `Record<string | symbol, unknown>`: pieces are spread across the UI with no guarantee of shape at a given drop. Never cast — validate.

### Pattern 1: symbol-key type guard

```ts
const privateKey = Symbol('Card');
type Card = { [privateKey]: true; cardId: string };

function getCard(data: Omit<Card, typeof privateKey>): Card {
  return { [privateKey]: true, ...data };
}
export function isCard(data: Record<string | symbol, unknown>): data is Card {
  return Boolean(data[privateKey]);
}

draggable({ element, getInitialData: () => getCard({ cardId: '1' }) });

dropTargetForElements({
  element,
  canDrop: ({ source }) => isCard(source.data),
  onDrop({ source }) {
    if (!isCard(source.data)) return;
    source.data.cardId; // typed as string
  },
});
```

### Pattern 2: zod

```ts
const CardSchema = z.object({ cardId: z.string() });
canDrop: ({ source }) => CardSchema.safeParse(source.data).success,
onDrop({ source }) {
  const result = CardSchema.safeParse(source.data);
  if (!result.success) return;
  result.data.cardId;
}
```

Generics were intentionally NOT used by the library (they'd be unsound — nothing guarantees the shape at runtime).

## Isolating experiences

By default any draggable can drop on any element drop target and monitors hear everything. Scope with a `type` field:

```ts
draggable({ element, getInitialData: () => ({ type: 'card', cardId, columnId }) });
dropTargetForElements({ element, canDrop: ({ source }) => source.data.type === 'card' });
monitorForElements({ canMonitor: ({ source }) => source.data.type === 'card' });
```

Remember: `canDrop` is re-evaluated throughout the drag; `canMonitor` only at drag start.

## Virtualization notes

- A dragging `draggable` may be unmounted mid-drag (scrolled out of a virtual window) — events stop firing on it, so listen on a monitor or on a stable drop target instead.
- If the dragging draggable was removed AND the user drops outside any target, pdnd can only detect the end via subsequent user input (slight delay). Avoid this by making a large stable element (list container or `body`) a drop target so a real `"drop"` event always fires.
