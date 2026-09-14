# Plan — Fixed layout mode

Editor mode for fixed-layout books (EPUB FXL and similar): pages with declared dimensions and absolutely positioned elements that reproduce the printed page. The current mode (flow, Tailwind, hitbox reordering) keeps existing; fixed layout is a second behaviour of the canvas, the drag and drop and the inspector, chosen per document.

Priorities, in this order: **1) glitch-free dragging with 1 px precision, 2) visual fidelity to the original book, 3) everything else.**

The patterns applied come from the `pragmatic-dnd-core`, `pragmatic-dnd-react`, `vercel-composition-patterns`, `vercel-react-best-practices` and `react-doctor` skills. Each section cites the rule that justifies it when it is not obvious.

---

## 0. What changes compared to flow mode

| Topic | Flow (today) | Fixed layout |
|---|---|---|
| Page | Width from a preset, height from content | Fixed width × height from the document; zoom through `transform: scale()` |
| Element position | Given by DOM order | `position: absolute; left; top` in `px`, written into the `style` attribute |
| Dropping an existing element | Reorders/nests by zone (edge/center) with priority to the parent | Moves to the **page container** (first parent in the structure) and records the new position; every element sits at the same level |
| Indicator | Target line/box | Ghost of the element itself at the final position + alignment guides |
| Native preview | Chip with tag and classes | Two strategies: **image** (rasterized native preview) or **rendered copy** (live ghost in its own layer) |
| Tree order | Reading order | Stacking order (last = on top); the tree becomes the z-order control |
| Document CSS | Compiled Tailwind only | `<style>` and `<link>` from the `<head>` are applied to the canvas, scoped, so the page looks like the book |
| Inspector | Tailwind categories | **Position** section (X, Y, W, H, z-order, lock) besides what already exists for inline `style` |

Nothing changes in the input/output contract: the output is still the same HTML, with updated `style` and moved nodes. The fidelity guarantees of `plan.md` §0 hold in full.

---

## 1. Architecture decisions

| Topic | Decision | Why |
|---|---|---|
| Activation | `layout="flow" \| "fixed" \| "auto"` prop on `<HtmlEditor>`, default `auto` | Detection covers most cases; the explicit prop covers non-standard fixtures. |
| `auto` detection | Full document **and** `<meta name="viewport" content="width=…, height=…">` in the `<head>` (the EPUB FXL rule). Fallback: root with ≥ 80% of element children with computed `position: absolute` after the first layout | The meta is the canonical source of the page size; the fallback catches HTML exported from PDF without the meta. |
| Page size | From the viewport meta; without it, from the page container's bounding box; with nothing, 1200 × 1600 and a warning | There is always a stable size for zoom and coordinates. |
| Page container | `pageContainerOf(doc)` function: if the root has exactly one element child, that is it; otherwise the root. Replaceable through the `fixedLayout.pageContainer` prop | FXL usually has a single `<div class="page">`; when it does not, the `<body>` is the plane. |
| Coordinates | Everything in **page units** (document px), never screen px. Conversion: `(clientX − pageRect.left) / scale`, `scale` measured as `pageRect.width / page.width` on every frame | Zoom, scroll and auto-scroll are correct by construction; one rect read per frame. |
| Where the position is written | Always `left`/`top` in integer `px` (`fixedLayout.precision: 1 \| 0.5 \| 0.1` option) in the `style` attribute, preserving the other declarations and their order (existing `parseInlineStyle`/`formatInlineStyle`) | Inline beats `<head>` classes; the output stays readable and stable. |
| Elements positioned by `right`/`bottom`, `%` or `transform: translate` | On the first move the value is **frozen** into `left`/`top` px from the measured rect; `right`/`bottom` are removed; `translate` is kept and the delta goes to `left`/`top` | One write model only; the element does not jump because the measured rect already includes everything. |
| Reparent on drop | `moveNode(id, { parentId: pageContainer, index })` + `setAttr(style)` in the **same history entry** (new `placeNode` action) | Undo reverts move and position together. |
| Index when reparenting | By default at the end (on top). `fixedLayout.keepStacking: true` option inserts right after the source's top-level ancestor | The end is what the user expects when "pulling" something out; the option preserves the original paint order. |
| Inheritance when reparenting | Before moving, compare computed `font-family`, `font-size`, `line-height`, `color`, `text-align`, `letter-spacing` in the old parent and in the container; what differs becomes an inline declaration (**inheritance freeze**) | Leaving a styled parent must not change the text's appearance. |
| Ghost | Strategy registered in the `CanvasContext` through **explicit parts** `Canvas.ImageGhost` and `Canvas.LiveGhost` (default `LiveGhost`); no boolean prop | `architecture-avoid-boolean-props`, `patterns-explicit-variants`. |
| Transient drag state | Imperative `fixedDragStore` (ghost position, active guides), direct `transform` writes like the `DropIndicator` does today | Zero re-render per frame (`rerender-use-ref-transient-values`). |
| Loading | The whole `src/lib/fixed/**` module comes in through `React.lazy`/`import()` when the mode is `fixed` | `bundle-conditional`, `bundle-dynamic-imports`: whoever only uses flow does not pay. |
| DnD | Still `@atlaskit/pragmatic-drag-and-drop` (element adapter) for uniformity with the tree and the palette. Movement on the page uses the `draggable`'s `onDrag` + a single `dropTargetForElements` on the page container | One event system only; `pickDropTarget` and hitboxes are off in fixed mode. |
| Plan B for movement | If the spike (§6) shows insufficient native `dragover` cadence, movement **inside** the page switches to pointer events (`pointerdown/move/up` + `setPointerCapture`), keeping pdnd for palette → page and tree → page | Precision rules; the decision is made with measurements, not opinions. |

---

## 2. Folder structure

```
src/lib/fixed/
  detect.ts            # detectLayout(doc) → 'fixed' | 'flow'; readViewportMeta(head) → { width, height } | null
  geometry.ts          # toPage(client, pageRect, scale), snap(), roundTo(precision), rectsToGuides()
  position.ts          # readPosition(el), freezePosition(node, rect), writePosition(node, x, y) → StyleWrite[]
  inheritance.ts       # freezeInheritance(el, newParentEl) → declarations to copy
  pageContainer.ts     # pageContainerOf(doc, override?)
  fixedDragStore.ts    # ghost transform, guides, dragged element (imperative, no React)
  useFixedDraggable.ts # draggable() per positioned element; onDrag → fixedDragStore
  useFixedPageDropTarget.ts
  useFixedDropMonitor.ts
  ghost/
    ImageGhost.tsx     # registers the 'image' strategy (setCustomNativeDragPreview)
    LiveGhost.tsx      # registers the 'live' strategy (disableNativeDragPreview + live layer)
    GhostLayer.tsx     # absolute layer over the page where the LiveGhost draws
    snapshot.ts        # cloneForPreview(el, scale) used by the ImageGhost
  guides/
    Guides.tsx         # smart guides overlay (SVG), reads from fixedDragStore
    computeGuides.ts   # sibling edges and centers, threshold in page units
  stylesheet/
    documentCss.ts     # extracts <style> and <link> from envelope.head
    useDocumentStylesheet.ts  # injects scoped (reuses scopeCss), resolves URLs through resolveAsset
  FixedPage.tsx        # Canvas.FixedPage part (fixed-size page + zoom + GhostLayer + Guides)
  Zoom.tsx             # Canvas.Zoom part (fit, 50, 100, 200)
  InspectorPosition.tsx# Inspector.Position part
  __tests__/
```

Pure modules (`detect`, `geometry`, `position`, `inheritance`, `pageContainer`, `computeGuides`, `documentCss`) without React and without DOM beyond `DOMRect`, testable in jsdom.

---

## 3. Detailed design

### 3.1 Context and composition

`EditorContextValue` gains `layout: 'flow' | 'fixed'` (already resolved, never `auto`) and `fixedLayout: { page: { width; height }, pageContainerId, precision, keepStacking, resolveAsset }`.

`CanvasContextValue` moves to the `state / actions / meta` shape (`state-context-interface`), keeping the current fields for compatibility:

```ts
type CanvasState = { width; presetId; isDark; stylesReady; zoom: number; scale: number }
type CanvasActions = { setPreset; setIsDark; setZoom; registerGhost(strategy: GhostStrategy): () => void }
type CanvasMeta = { pageRef: RefObject<HTMLElement | null>; registerGhostLayer(el: HTMLElement | null): void }
```

New parts, all optional and without boolean props:

```tsx
<HtmlEditor layout="auto" fixedLayout={{ resolveAsset: (url) => cdn(url) }}>
  <HtmlEditor.Canvas>
    <HtmlEditor.Canvas.Toolbar>
      <HtmlEditor.History />
      <HtmlEditor.Canvas.Zoom />
    </HtmlEditor.Canvas.Toolbar>
    <HtmlEditor.Canvas.FixedPage>
      <HtmlEditor.Canvas.Guides />
      <HtmlEditor.Canvas.LiveGhost />      {/* or <HtmlEditor.Canvas.ImageGhost /> */}
    </HtmlEditor.Canvas.FixedPage>
  </HtmlEditor.Canvas>
  <HtmlEditor.Inspector>
    <HtmlEditor.Inspector.Position />
    <HtmlEditor.Inspector.Attributes />
  </HtmlEditor.Inspector>
</HtmlEditor>
```

`Canvas.Viewport` (flow) and `Canvas.FixedPage` (fixed) are explicit variants. `DefaultLayout` picks by the resolved `layout`. `Canvas.WidthPresets` renders nothing in fixed mode; `Canvas.Zoom` renders nothing in flow mode.

### 3.2 Page and zoom

`FixedPage` renders:

```
.scroll (overflow: auto, pdnd auto-scroll)
  .stage (padding, centers)
    .page  (page width/height in px, transform: scale(zoom), transform-origin: 0 0)
      .adt-canvas  (editable root, position: relative, overflow: hidden)
        <CanvasNode …/>
      GhostLayer   (position: absolute; inset: 0; pointer-events: none)
    Guides (absolute SVG over the stage, screen coordinates)
```

The real `scale` is measured (`pageRect.width / page.width`) and not assumed equal to `zoom`, to tolerate fractional `devicePixelRatio` and the book's own `transform` wrappers. "Fit" zoom recomputes in a `ResizeObserver` on `.scroll`.

`SelectionOverlay` already uses `getBoundingClientRect`; it works unchanged. Resize handles are out of scope for this version (§7).

### 3.3 Document CSS

`documentCss.ts` extracts every `<style>` and every `<link rel="stylesheet" href>` from `envelope.head`. `useDocumentStylesheet` injects a `<style data-adt-document>` into `document.head`:

- Scoped with `@scope (.adt-canvas)` and a prefix fallback, reusing `scopeCss`. `html`, `body` and `:root` selectors are rewritten to `.adt-canvas`.
- `@font-face` stays **outside** the scope (global rule) with URLs rewritten through `resolveAsset`.
- `<link>` is fetched with `fetch` only if `resolveAsset` returns a URL; without a resolver it is ignored with a console warning in dev.
- Relative `url(...)` in `background`, `<img>` `src` and `<link>` go through `resolveAsset`. Without a resolver they stay as they are.
- Same sanitization as opaque nodes (removes `expression()`, `javascript:` and `@import` for unresolved origins).

This also improves flow mode for full documents; it sits behind `layout="fixed"` in this phase and becomes a general option later.

### 3.4 Position: reading, freezing and writing

- **Reading** for the inspector and for the drag start: `readPosition(el, pageEl, scale)` returns `{ x, y, w, h }` in page units from the rects. It never parses CSS to know where the element is.
- **Freezing** (`freezePosition`): if the inline `style` has no `left`/`top` in px, or has `right`/`bottom`, or has `%`, the first `placeNode` writes `position: absolute; left: Xpx; top: Ypx`, removes `right`/`bottom`, keeps `width`/`height` if they existed and keeps `transform`. `position: fixed` elements are treated as `absolute`.
- **Writing** (`writePosition`): `inlineCssAdapter.write` for `left` and `top` with `roundTo(precision)`. A single `style` write, coalesced by `attr:${id}:style` (already exists).
- Order of operations of `placeNode(id, { x, y, parentId, index })` in the store: inheritance freeze → position freeze → `setAttr(style)` → `moveNode` if the parent changes, all inside a single `commit` (new `batch` option on `commit`, or one action composing both mutations on the same `draftNodes`).

### 3.5 Dragging inside the page (pixel perfect)

`useFixedDraggable(el, id)` registers `draggable()` on every element child of the page container **and** on nested elements (to allow pulling something out of a group to the page level):

```ts
draggable({
  element,
  getInitialData: () => nodeDrag({ nodeId, surface: 'canvas', label }),
  onGenerateDragPreview: (args) => ghost.strategy.generatePreview(args, { element, scale }),
  onDragStart: ({ location }) => {
    fixedDragStore.begin({
      id: nodeId,
      grab: toPage(location.initial.input, pageRect(), scale()) - readPosition(element).xy,
      origin: readPosition(element),
      siblings: cacheSiblingRects(),        // js-cache-function-results: one read per drag
    })
    ghost.strategy.start(element)
    if (ghost.strategy.hidesNativePreview) preventUnhandled.start()
  },
  onDrag: ({ location }) => {
    const pointer = toPage(location.current.input, pageRect(), scale())
    const raw = pointer - grab
    const { position, guides } = snapWithGuides(raw, size, siblings, threshold / scale)
    fixedDragStore.update(position, guides)   // ghost.transform and Guides read from here, no React
  },
  onDrop: ({ location }) => {
    const cancelled = location.current.dropTargets.length === 0
    ghost.strategy.end()
    preventUnhandled.stop()
    if (!cancelled) actions.placeNode(nodeId, { ...fixedDragStore.position, parentId: pageContainerId, index })
    fixedDragStore.end()
  },
})
```

Rules for a glitch-free drag:

- The original element is **never** moved, hidden or unmounted during the drag (Chrome cancels the native drag if the source leaves the DOM). It receives `data-dragging` and a reduced opacity through CSS; the final position is applied only in `onDrop`.
- Ghost and guides change only through `transform`, with `will-change: transform` and `pointer-events: none`. No layout is invalidated per frame.
- `pageRect` is read once per frame (one `getBoundingClientRect`); the rest comes from the sibling rect cache built in `onDragStart`; the cache is invalidated by scroll and zoom.
- `user-select: none` on the page during the drag; nested `<img>` and `<a>` get `draggable="false"` in the canvas render in fixed mode, so the image's native drag does not steal the gesture.
- `getDropEffect: () => 'move'` on the page container, so the cursor does not flicker between copy/move.
- Pointer leaving the window: pdnd stops emitting `onDrag`; the ghost freezes at the last position and the later `onDrop` decides (drop outside the page = cancel, no effect).
- Keyboard: arrows move 1 px, Shift+arrows 10 px, all through `placeNode` with 500 ms coalescing into one history entry. It is the pixel-perfect path when the mouse is not enough.
- Snap: 1 px grid by default (`precision`); smart guides on sibling and page edges and centers, 4 screen px threshold converted to page units. Alt disables snapping during the drag (read from `location.current.input.altKey`).

### 3.6 Reparenting to the page container

When the dragged element is nested (e.g. `div.group > p`), on drop it goes to `pageContainerId`:

1. `freezeInheritance(el, pageEl)` compares computed styles in the current parent and in the container; differences go into `style`.
2. The final position computed in page units is already relative to the container, because `readPosition` measures against the page; no extra conversion.
3. Index: end of the container, or right after the top-level ancestor when `keepStacking`.
4. If the old parent becomes empty and is a wrapper with no styling of its own (no `style`, no `class`, no `id`), it is **not** removed automatically; it stays visible in the tree as empty. Automatic removal would be a silent loss.

Palette and tree drops in fixed mode use the same `placeNode`: the palette inserts at `pointer − half of the template's default size`; the tree over the page reparents and positions at the pointer. The tree keeps accepting sibling reordering as the z-order control, and the flow mode `pickDropTarget` does not run when `layout === 'fixed'`.

### 3.7 Ghost — version A: image (native preview)

`ImageGhost` registers `{ id: 'image', hidesNativePreview: false, generatePreview, start, end }`:

- `generatePreview` uses `setCustomNativeDragPreview` with `render({ container })`: `cloneForPreview(element, scale)` does `cloneNode(true)`, copies computed `width`/`height`, applies `transform: scale(scale)` and `transform-origin: 0 0`, removes `data-adt-id` and `contenteditable`, marks `<img>` as `draggable=false`. For a bare `<img>`, the clone is the `<img>` itself (the browser uses the decoded bitmap). The container gets `getOffset: preserveOffsetOnSource({ element, input })`, so the pointer holds the ghost exactly where it grabbed it.
- While the native preview is a snapshot taken at the start, the **final position** is shown by a thin rectangle (`outline`) drawn by the `GhostLayer` at the snapped position, plus the guides. The user sees both the "photo" and the exact fit.
- Advantages: rendering off the main thread, zero cost per frame, no flicker risk. Documented limitations: the OS may apply transparency and shadow; Chrome limits the preview size (fallback: if the scaled clone exceeds 2000 px on one axis, reduce the clone scale and keep the target rectangle correct); the photo does not reflect zoom changed during the drag.

### 3.8 Ghost — version B: rendered copy (live ghost)

`LiveGhost` registers `{ id: 'live', hidesNativePreview: true, … }`:

- `generatePreview` calls `disableNativeDragPreview(nativeSetDragImage)`; `onDragStart` calls `preventUnhandled.start()` to suppress the cancelled native drag's "fly back" animation.
- `start(element)` mounts a copy of the element in the `GhostLayer`. Two forms, chosen by the strategy: `cloneNode(true)` (cheap, loses React state, enough because the ghost is not interactive) is the default; `createRoot(container).render(<CanvasNode id />)` remains an option for when the clone loses something rendered by React (e.g. opaque node placeholders). The copy receives `position: absolute; left: 0; top: 0; width; height; pointer-events: none; will-change: transform`.
- `fixedDragStore.update` writes `transform: translate3d(x, y, 0)` in page units (the `GhostLayer` lives inside `.page`, so the `scale` already applies). The original element gets `opacity: .35` and a dashed `outline` marking the origin.
- Advantages: exact live fit and guides, crisp at any zoom, no OS-imposed transparency. Cost: one `transform` per frame on the main thread; measured in the spike (§6) with 300 elements.
- Cancellation (Esc or drop outside the page): the copy animates back to the origin in 120 ms with `transition: transform` and is removed; respects `prefers-reduced-motion`.

Both strategies implement the same `GhostStrategy` interface; `useFixedDraggable` only knows the interface (`state-decouple-implementation`).

### 3.9 Inspector — Position

`Inspector.Position` shows X, Y, W, H (integer px, `font-variant-numeric: tabular-nums`), z-order (index in the container with "bring forward"/"send backward" buttons calling `moveNode`) and "lock position" (**not** a `data-adt-locked` attribute: locking must stay out of the output, so it goes into a `Set<NodeId>` in editor state, not in the document). Inputs write on `onBlur`/Enter through `placeNode`, with coalescing.

X, Y, W, H are read from a `ResizeObserver`/`MutationObserver` on the selected element (same scheme as `SelectionOverlay`), not from parsing `style`, to reflect what is rendered.

---

## 4. Performance rules (applied in every phase)

- Zero React re-render per drag frame: ghost, guides and target rectangle are updated through the imperative store and `style.transform` (`rerender-use-ref-transient-values`, `js-batch-dom-css`).
- One page `getBoundingClientRect` read per frame; sibling rects cached per drag (`js-cache-function-results`); guides computed in a single loop over the siblings (`js-combine-iterations`, early exit once the snap matched on both axes).
- `useEffectEvent` to read `zoom`, `precision` and the ghost strategy inside pdnd callbacks without re-registering `draggable` (`rerender-dependencies`, `advanced-effect-event-deps`).
- Overlay components (`GhostLayer`, `Guides`) do not subscribe to the editor store; only to `fixedDragStore` (`rerender-defer-reads`).
- `src/lib/fixed/**` loaded on demand; the flow mode bundle does not grow (`bundle-conditional`).
- Document CSS injected once per document, rebuilt only when `envelope.head` changes.
- Acceptance measured with `npx react-doctor scan <url>` recording a 5 s drag on a page with 300 positioned elements: no frame > 16 ms attributed to the editor; `npx react-doctor --scope changed` at 100 in every phase.

---

## 5. Phases

### Phase F0 — Spikes (1 day)
- [ ] pdnd `onDrag` cadence in Chrome, Firefox and Safari with one `translate3d` per event; compare with pointer events. Decides the plan B of §1.
- [ ] `disableNativeDragPreview` + `preventUnhandled` in Safari and Firefox: confirm no native ghost or return animation is left.
- [ ] Native preview size limit in Chrome with a clone scaled to 200%.
- [ ] Real fixtures: at least two FXL books (one with `<style>` in the head and positions by class; another with inline `style` and `%`) in `src/playground/fixtures/fixed/`.
- **Done when**: the three measurements are recorded in this file and the §1 decisions confirmed or replaced.

### Phase F1 — Detection, page and document CSS (2 days)
- [ ] `detect.ts`, `readViewportMeta`, `pageContainerOf`; `layout` and `fixedLayout` props on `EditorProvider`; resolved `layout` in the context.
- [ ] `FixedPage`, `Zoom` (fit/50/100/200), measured `scale`, `CanvasContext` in `state/actions/meta` keeping the old fields.
- [ ] `documentCss.ts` + `useDocumentStylesheet` with scope, global `@font-face`, `resolveAsset`.
- [ ] `<img>`/`<a>` with `draggable="false"` in the canvas in fixed mode.
- [ ] Tests: detection (with and without meta), page size, CSS extraction and scoping (snapshot), `html/body → .adt-canvas`.
- **Done when**: the FXL fixtures open in the playground visually identical to the browser opening the original file, at 100% zoom, with ≤ 1 px difference in element positions (measured by a script comparing rects).

### Phase F2 — Position model and `placeNode` (1–2 days)
- [ ] `geometry.ts` (`toPage`, `roundTo`, `snap`), `position.ts` (`readPosition`, `freezePosition`, `writePosition`), `inheritance.ts`.
- [ ] `placeNode` action in the store: freeze + `style` + `moveNode` in one commit, `place:${id}` coalescing.
- [ ] Keyboard arrows on the canvas in fixed mode (1 px / 10 px).
- [ ] Tests: freeze of `right/bottom`, `%`, `translate`; inheritance frozen only when it differs; one `placeNode` = one history entry; idempotent fixture round-trip after several `placeNode`.
- **Done when**: moving by keyboard and by inspector writes correct integer `left/top` and the output keeps passing the round-trip.

### Phase F3 — Dragging on the page with the live ghost (2–3 days)
- [ ] `fixedDragStore`, `useFixedDraggable`, `useFixedPageDropTarget`, `useFixedDropMonitor`; `pickDropTarget` and hitbox off in fixed mode.
- [ ] `GhostLayer` + `LiveGhost` (clone), origin rectangle, animated cancellation, `preventUnhandled`.
- [ ] `Guides` + `computeGuides` (edges and centers, page included), Alt disables snap.
- [ ] Reparent to the page container with optional `keepStacking`; palette and tree drops.
- [ ] Tests: pure `computeGuides` and `snap`; monitor with synthetic events (same technique used for parent priority) checking final position, reparent and cancellation.
- **Done when**: dragging any element, nested included, and dropping at 100% and 200% zoom results in `left/top` equal to the ghost position on the drop frame, with no visual jump, and the element becomes a child of the page container.

### Phase F4 — Image ghost (1 day)
- [ ] `ImageGhost` with `cloneForPreview`, `preserveOffsetOnSource`, size fallback.
- [ ] Snapped target rectangle in the `GhostLayer` while the native preview follows the pointer.
- [ ] Playground toggle to switch between the two strategies on the same fixture.
- **Done when**: both strategies produce the same final position for the same gesture (synthetic test) and the image version draws nothing on the main thread per frame besides the rectangle.

### Phase F5 — Inspector Position and z-order through the tree (1–2 days)
- [ ] `Inspector.Position` (X, Y, W, H, z-order, lock); locked elements do not register `draggable`.
- [ ] Tree: stacking-order label in fixed mode; reordering in the tree = z-order.
- [ ] Live region: "moved to X, Y".
- **Done when**: editing X in the inspector, dragging and using arrows converge to the same `style`; `react-doctor design` without errors in the new components.

### Phase F6 — Hardening (1 day)
- [ ] `react-doctor scan` with 300 elements; fix hot paths.
- [ ] Accessibility audit of the new parts (focus, `aria-pressed` on zoom, guide contrast).
- [ ] README: "Fixed layout mode" section with the parts, the `layout` prop, `resolveAsset` and the limitations.
- **Done when**: `bun run test`, `lint`, `typecheck` and `react-doctor --scope changed` at 100; README updated.

---

## 6. Risks and spikes

| Risk | Impact | Mitigation / spike |
|---|---|---|
| Native `dragover` with low or irregular cadence in some browser | F3 | Spike F0; plan B with pointer events only for movement inside the page. |
| `<head>` CSS with selectors `scopeCss` does not cover (`html[lang]`, `:root` with variables, `@page`, `@import`) | F1 | Snapshots per fixture; explicit rewrite list; `@page` dropped; `@import` only with `resolveAsset`. |
| Relative fonts and images without a base URL | F1 | `resolveAsset` required for fidelity; without it, dev warning and placeholders with the declared size (`<img>` `width`/`height`) so the layout does not fall apart. |
| Elements with their own `transform: rotate/scale` | F2–F3 | `left/top` receive the delta; the measured rect is only for the ghost and the guides, which use the bounding box. Document that snapping is on the bounding box. |
| Book wrapper with responsive `transform: scale()` inside the body | F1–F3 | Measured `scale`, not assumed; `toPage` uses the page container's rect, not `.page`'s. |
| Inheritance lost when reparenting | F3 | Inheritance freeze (§3.4) with a closed property list; test with a fixture of text inside a styled group. |
| Chrome cancels the drag if the source leaves the DOM | F3 | The source never unmounts; `CanvasNode` keeps a stable key; `placeNode` only in `onDrop`. |
| Native preview too large or made transparent by the OS | F4 | Clone scale fallback; target rectangle always drawn by the `GhostLayer`; document it. |
| Drop outside the window or in another application | F3 | `dropTargets.length === 0` in `onDrop` = cancel; `preventUnhandled` active only with `LiveGhost`. |
| Many elements (magazine pages with 500+ nodes) | F3 | Rect cache per drag; guides only for siblings visible in the viewport; measure with `react-doctor scan`. |
| `auto` detection failing on HTML exported from PDF without meta | F1 | Fallback on computed `position: absolute` after the first layout; `layout="fixed"` prop always available. |
| Touch | General | Same as `plan.md`: desktop-first; the plan B pointer events would already pave the way for touch later. |

---

## 7. Out of scope (this version)

Resizing and rotating through handles, multi-selection, batch alignment/distribution, `<head>` editing, side-by-side two-page spreads, touch support, PDF export.
