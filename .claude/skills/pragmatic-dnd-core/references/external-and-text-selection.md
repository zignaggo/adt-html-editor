# External adapter and text selection adapter

## External adapter

Handles drags that started outside the current window: OS files, and text/URLs/HTML from other windows (including child iframes).

```ts
import { dropTargetForExternal, monitorForExternal } from '@atlaskit/pragmatic-drag-and-drop/external/adapter';
```

- Default `dropEffect` is `"copy"`.
- Event differences from the standard flow:
  - No `onGenerateDragPreview` (the preview was generated externally).
  - Drop targets get NO `onDragStart` (an external drag can't start inside a target). Use a monitor's `onDragStart` to know a file entered the window; use the drop target's `onDragEnter`/`onDragLeave`/`onDrop` for over-state.

### Filtering by native data type

Per-type predicates + `getFiles`/`getText`/etc. helpers live in dedicated entry points:

```ts
import { containsFiles, getFiles } from '@atlaskit/pragmatic-drag-and-drop/external/file';
import { containsText, getText } from '@atlaskit/pragmatic-drag-and-drop/external/text';
// analogous entry points exist for URLs, HTML and custom media types
import { some } from '@atlaskit/pragmatic-drag-and-drop/external/some';

dropTargetForExternal({
  element: el,
  canDrop: some(containsFiles, containsText),
  onDrop({ source }) {
    const files = getFiles({ source });
    const text = getText({ source });
  },
});

monitorForExternal({
  canMonitor: containsFiles,
  onDragStart: () => { /* a file entered the window */ },
});
```

`some(...predicates)` returns `true` if any predicate matches. You can write your own predicates too.

### Security model — data only at drop

During the drag you can only see the **types** being dragged (e.g. `"text/plain"`). The actual data (`source.items`, a `DataTransferItem[]`) is only populated:

1. inside `onDrop()`, and
2. when the user dropped on a drop target (including via stickiness).

Otherwise `source.items` is `[]`. Always extract data through the helpers (`getFiles`, `getText`, ...), inside `onDrop`.

### Preventing default drop behavior

To stop the browser from e.g. opening a dropped file as a new page even when it misses your targets, use `preventUnhandled` from a monitor (see utilities-and-typing.md):

```ts
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
monitorForExternal({
  onDragStart: () => preventUnhandled.start(),
});
```

### Cross-domain / iframe constraints

Allowed everywhere: page → another tab (same or different domain), page → native apps, page → same-domain child iframe, same-domain iframe → iframe, page → iframe in a different tab.

NOT allowed (Chrome ~122, Safari ~14.3.1): parent window → child iframe on a DIFFERENT domain, and child iframe → parent on a different domain.

## Text selection adapter

Handles the user dragging selected text. There is no `draggable` — the browser makes selections draggable.

```ts
import {
  dropTargetForTextSelection,
  monitorForTextSelection,
} from '@atlaskit/pragmatic-drag-and-drop/text-selection/adapter';
```

- Default `dropEffect` is `"copy"`.
- Source payload:

```ts
type TextSelectionDragPayload = {
  target: Text;   // Text node where the drag started (not the whole selection)
  plain: string;  // full selection, plain text
  HTML: string;   // full selection, HTML
};
```

Types (`TextSelectionEventBasePayload`, `TextSelectionDropTargetEventBasePayload` with `self`, feedback args, event payload maps) follow the same shape as the element adapter and are exported from the same `/text-selection/adapter` entry point.
