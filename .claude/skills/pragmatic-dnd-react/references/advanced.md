# Deferred loading and virtualization (React)

## Deferred loading

pdnd is a plain library, so besides `React.lazy` on components you can lazily attach behavior AFTER a component has rendered.

### Option A: `React.lazy` on the component

```tsx
import { Suspense, lazy } from 'react';
const LazyCard = lazy(() => import('./card'));

<Suspense fallback="loading..."><LazyCard /></Suspense>
```

### Option B: dynamic import inside the effect

```tsx
function Card({ item }: { item: Item }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const itemId = item.itemId;

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      const [{ draggable, dropTargetForElements }, { combine }] = await Promise.all([
        import('@atlaskit/pragmatic-drag-and-drop/element/adapter'),
        import('@atlaskit/pragmatic-drag-and-drop/combine'),
      ]);

      if (controller.signal.aborted || !ref.current) return;

      const cleanup = combine(
        draggable({
          element: ref.current,
          getInitialData: () => ({ type: 'card', itemId }),
        }),
        dropTargetForElements({
          element: ref.current,
          canDrop: (args) => args.source.data.type === 'card',
          getData: () => ({ type: 'card', itemId }),
        }),
      );

      controller.signal.addEventListener('abort', cleanup, { once: true });
    })();

    return () => controller.abort();
  }, [itemId]);

  return <div ref={ref}>{itemId}</div>;
}
```

The `AbortController` handles both "unmounted before the import resolved" and "unmounted after binding" with one cleanup path.

## Virtualization (react-window, react-virtuoso, custom windowing)

pdnd works with virtualization; the constraints come from the web platform:

- **Draggables may unmount mid-drag** when scrolled out of the window. That's allowed, but events stop firing on the removed `draggable` — so put your drag-operation logic on a **monitor** or on a stable **drop target** (list container), never only on the item.
- **Guarantee a real `"drop"` event.** pdnd detects drag end via `"drop"` (on a target), `"dragend"` (on the draggable), or later user input. If the dragging item was virtualized away AND the user drops outside any target, only the last (delayed) mechanism remains. Fix: make a large stable element a drop target — the virtual list container or even `body` — so drops always land on a valid target.
- Adding new draggables/drop targets during a drag is supported (items scrolling into view register normally, see reconciliation in `pragmatic-dnd-core`).
- For scrolling while dragging near list edges, consider `@atlaskit/pragmatic-drag-and-drop-auto-scroll`.
