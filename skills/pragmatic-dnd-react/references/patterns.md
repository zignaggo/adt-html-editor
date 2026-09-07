# React patterns

## Custom native drag preview

Prefer native previews (off-main-thread, work across applications). Use `setCustomNativeDragPreview` inside `onGenerateDragPreview`.

### Option A: portal (keeps React context, causes a re-render)

```tsx
import ReactDOM from 'react-dom';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';

type State = { type: 'idle' } | { type: 'preview'; container: HTMLElement };

function Item() {
  const [state, setState] = useState<State>({ type: 'idle' });
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    invariant(ref.current);
    return draggable({
      element: ref.current,
      onGenerateDragPreview({ nativeSetDragImage }) {
        setCustomNativeDragPreview({
          render({ container }) {
            setState({ type: 'preview', container }); // synchronous re-render → portal
            return () => setState({ type: 'idle' });
          },
          nativeSetDragImage,
        });
      },
    });
  }, []);

  return (
    <>
      <div ref={ref}>Drag me</div>
      {state.type === 'preview'
        ? ReactDOM.createPortal(<Preview />, state.container)
        : null}
    </>
  );
}
```

### Option B: new React root (no re-render, loses context)

```tsx
setCustomNativeDragPreview({
  render({ container }) {
    ReactDOM.render(<Preview item={item} />, container);
    return () => ReactDOM.unmountComponentAtNode(container);
    // React 18: use createRoot(container).render(...) / root.unmount()
  },
  nativeSetDragImage,
});
```

Positioning: pass `getOffset` or the helpers `pointerOutsideOfPreview`, `centerUnderPointer`, `preserveOffsetOnSource` (see pragmatic-dnd-core → element-adapter reference). `getOffset` runs a microtask after `render`, so React 18's async rendering has time to fill the container.

## Conditional dragging

`canDrag: () => false` cancels the whole native drag — a parent draggable can't take over. In React, conditionally register instead:

```tsx
useEffect(() => {
  if (!isDraggingEnabled) return; // parent draggable still works
  invariant(ref.current);
  return draggable({ element: ref.current });
}, [isDraggingEnabled]);
```

## Drag handles

```tsx
const itemRef = useRef<HTMLDivElement | null>(null);
const handleRef = useRef<HTMLButtonElement | null>(null);

useEffect(() => {
  invariant(itemRef.current && handleRef.current);
  return draggable({
    element: itemRef.current,
    dragHandle: handleRef.current,
  });
}, []);
```

## Drop indicators (reordering lines)

The usual recipe combines two optional packages:

- `@atlaskit/pragmatic-drag-and-drop-hitbox` — `attachClosestEdge(data, { input, element, allowedEdges })` inside the drop target's `getData()`, and `extractClosestEdge(self.data)` inside events to know which edge (`'top' | 'bottom' | 'left' | 'right'`) is closest.
- `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator` — renders the line.

Flow: drop target `getData` attaches closest-edge → `onDrag`/`onDragEnter` extract the edge into state → render the indicator on that edge → `onDrop` (usually in a monitor) computes the destination index from target index + edge, then `reorder(...)`.

If you're unsure of these packages' exact current APIs, verify against their docs pages rather than guessing.
