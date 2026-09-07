# Drop targets

Elements that can be dropped on. Exposed per adapter: `dropTargetForElements`, `dropTargetForExternal`, `dropTargetForTextSelection`.

## Rules

- Scoped to an entity type. One element may host drop targets of DIFFERENT types (combine element + external on the same element is fine), but never two of the SAME type (console warning).
- Drop targets can be nested to any depth.
- During a drag you may add, remove, remount (same element ⇒ same identity) and resize drop targets.

## Arguments

- `element: Element` (required).
- `getData?: (args: GetFeedbackArgs) => Record<string, unknown>` — data attached to the target, available as `self.data` / in `location.*.dropTargets[].data`. Called repeatedly; keep pure, wrap expensive computation with `once`, or compose with hitbox addons:

```ts
const getDataOnce = once(getExpensiveData);
dropTargetForExternal({
  getData: ({ input, element }) =>
    attachClosestEdge(getDataOnce(), { input, element, allowedEdges: ['top'] }),
});
```

- `canDrop?: (args) => boolean` — called repeatedly (you can change your mind mid-drag, e.g. after a permissions fetch). Returning `false` skips only THIS target; parents/children decide for themselves; the upward search continues.
- `getDropEffect?: (args) => DataTransfer['dropEffect']` — controls the cursor. Defaults: element → `"move"`, external/text-selection → `"copy"`. With nesting, the innermost target's effect wins (even if it's the default).
- `getIsSticky?: (args) => boolean` — hold onto "dragged over" state after the pointer leaves (useful for gaps between targets).
- Events: `onGenerateDragPreview`, `onDragStart`, `onDrag`, `onDropTargetChange`, `onDrop`, plus derived `onDragEnter` / `onDragLeave`.

```ts
type GetFeedbackArgs = {
  input: Input;
  source: SourcePayload; // adapter-specific
  element: Element;
};
```

Every drop target event also receives `self: DropTargetRecord`:

```ts
type DropTargetRecord = {
  element: Element;
  data: Record<string | symbol, unknown>; // from getData()
  dropEffect: Exclude<DataTransfer['dropEffect'], 'none'>;
};
```

## Stickiness algorithm

A target that would no longer be dragged over stays "dragged over" while ALL of these hold: it is still mounted, `canDrop()` returns `true`, `getIsSticky()` returns `true`, and its parent drop target is unchanged. Notation: `[inner, outer]`, bubble ordered.

| Transition | Result |
|---|---|
| `[A(sticky)] → []` | `[A]` |
| `[B(sticky), A(sticky)] → []` | `[B, A]` |
| `[C, B(sticky), A(sticky)] → []` | `[B, A]` |
| `[A(sticky)] → [B]` | `[B]` |
| `[B(sticky), A] → [A]` | `[B, A]` |
| `[B, A(sticky)] → [A]` | `[A]` |
| `[B(sticky), A] → [X]` or `[]` | `[X]` / `[]` |
| sticky target's `canDrop()` → false, `getIsSticky()` → false, or unmounted | stickiness lost |

Extra notes: leaving the window clears all targets regardless of stickiness; sticky-held targets do NOT get `getData()`/`getDropEffect()` recomputed — the last active values are preserved.

## Nested drop targets

Lookup starts at the deepest element under the pointer and walks upward; blocked targets (`canDrop() === false`) are skipped, the search continues.

- `[] → [B, A(blocked)]` results in `[B]`
- `[] → [C, B(blocked), A]` results in `[C, A]`

### Distinguishing parent vs child drops

All active targets get `onDrop`. In a parent, check whether an inner target was the real drop:

```ts
dropTargetForElements({
  element: parent,
  onDrop({ location, self }) {
    if (location.current.dropTargets[0]?.element === self.element) {
      // dropped directly on parent
      return;
    }
    // dropped on an inner target
  },
});
```
