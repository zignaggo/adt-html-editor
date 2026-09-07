---
name: pragmatic-dnd-react
description: React integration patterns for @atlaskit/pragmatic-drag-and-drop (Pragmatic drag and drop / pdnd). Use whenever writing React components that use pdnd — sortable lists, kanban boards, drag handles, drop zones, custom drag previews with portals, drag state (isDragging / isDraggedOver), lazy/deferred loading of pdnd, or drag and drop inside virtualized React lists. Use together with pragmatic-dnd-core, which documents the underlying API this skill attaches to React.
---

# Pragmatic drag and drop — React

pdnd is framework-agnostic; the React integration is just lifecycle management. This skill covers the recommended patterns. For the API itself (arguments, events, rules), consult the `pragmatic-dnd-core` skill first.

## Golden rules

1. Attach behavior in `useEffect`, return the cleanup function pdnd gives you.
2. Use a `ref` for the element; guard against `null` before registering.
3. Use `combine()` when one element is both draggable and a drop target.
4. Remounting effects mid-drag is safe: the element is the identity key, so a re-created `draggable`/drop target on the same element is treated as the same entity (reconciliation). Still, keep dependency arrays minimal — prefer functional `setState` (`setCount(c => c + 1)`) over depending on state.
5. Derive visual feedback from React state set inside pdnd events (`idle` / `dragging` / `draggedOver`), never by mutating the DOM directly.

## Canonical component

```tsx
import { useEffect, useRef, useState } from 'react';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import invariant from 'tiny-invariant';

type State = 'idle' | 'dragging' | 'draggedOver';

function Card({ item }: { item: Item }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    const el = ref.current;
    invariant(el);

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ type: 'card', itemId: item.itemId }),
        onDragStart: () => setState('dragging'),
        onDrop: () => setState('idle'),
      }),
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) => source.data.type === 'card',
        getData: () => ({ type: 'card', itemId: item.itemId }),
        onDragEnter: () => setState('draggedOver'),
        onDragLeave: () => setState('idle'),
        onDrop: () => setState('idle'),
      }),
    );
  }, [item.itemId]);

  return <div ref={ref} data-state={state}>{item.itemId}</div>;
}
```

## Monitors tied to component lifecycle

```tsx
useEffect(() => {
  return monitorForElements({
    canMonitor: ({ source }) => source.data.type === 'card',
    onDrop({ source, location }) {
      const target = location.current.dropTargets[0];
      if (!target) return;
      // reorder state here, e.g. with the `reorder` utility
    },
  });
}, [/* deps used inside onDrop */]);
```

The list-level `onDrop` in a monitor (rather than in each drop target) is the usual home for state updates like `reorder({ list, startIndex, finishIndex })`.

Warning: an effect without a dependency array recreates the monitor on every render. That works (reconciliation-free — monitors have no key) but is wasteful; give the effect a proper dependency array.

## Reference files

- `references/patterns.md` — custom native drag previews with React portals (and the new-root alternative), conditional dragging without `canDrag`, drag handles, drop indicator wiring with closest-edge data.
- `references/advanced.md` — deferred/lazy loading (React.lazy and dynamic-import-inside-effect with AbortController), virtualization (react-window etc.) requirements.
