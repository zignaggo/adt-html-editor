# Plan — adt-html-editor

React library for visual HTML editing with drag and drop, an element tree panel (left), a canvas (center) and a styles panel (right). Styling through Tailwind classes first; plain CSS later. Consumed by another project via `file:`/`bun link`, no npm publishing.

Priorities, in this order: **1) reliable and fluid drag and drop, 2) performance with large documents, 3) everything else.**

---

## 0. Prerequisite: HTML in, HTML out

The editor is one step of a workflow: it receives an HTML string, the user edits, and the workflow gets an HTML string back. That contract rules everything that follows.

### Contract

```ts
<HtmlEditor
  defaultValue={html}                       // uncontrolled
  value={html}                              // or controlled: reparse when it changes from outside
  onChange={(html: string, doc: Document) => void}
  ref={editorRef}                           // editorRef.current.getHtml() / setHtml() / getDocument()
/>
```

- `onChange` fires on every confirmed action (drop, class applied, attribute, text on leaving `contentEditable`, undo/redo). Never per drag frame nor per typed key.
- Serialization is synchronous and cheap (DOM `innerHTML` from the model; 2,000 nodes < 5 ms). Optional `changeDebounceMs` prop for those who prefer it.
- `getHtml()` on the ref so the workflow can pull the result whenever it wants (e.g. a "Finish" button).
- `value` changing from outside replaces the whole document and clears history and selection. Documented as expected behaviour.

### Accepted formats

| Input | How it is handled | Output |
|---|---|---|
| Fragment (`<section>…</section><p>…</p>`) | Direct children become children of the virtual root node | Fragment |
| Full document (`<!doctype html><html><head>…</head><body>…</body></html>`) | Only the `<body>` content is edited; `<!doctype>`, `<html>` (attrs), the whole `<head>` and `<body>` attrs are kept as opaque text | Full document, with a `<head>` identical to the original |
| Detection | Presence of `<html`, `<head` or `<body` in the input | — |

### Fidelity guarantees

- **DOM equivalence, not byte equivalence.** `serialize(parse(html))` produces HTML whose DOM equals the input's; original indentation and line breaks are not preserved. Mandatory idempotence test: `serialize(parse(serialize(parse(x)))) === serialize(parse(x))` for every fixture.
- Preserved: every attribute (`id`, `style`, `data-*`, `aria-*`, `href`…) in the original order; class order; unknown tags and custom elements; HTML comments (`comment` node, visible in the tree, not editable); entities (correct escaping through the DOM serializer, not string concatenation).
- `<script>`, `<style>`, `<svg>`, `<iframe>`, `<template>` inside the body: **opaque** nodes. They show in the tree, can be moved/removed, accept no children, and their inner content is re-emitted byte for byte.
- Whitespace-only text nodes between block elements are dropped on parse (they do not appear in the tree); whitespace inside real text is kept. `<pre>`, `<textarea>` and opaque nodes preserve whitespace in full.
- Nothing from the editor leaks into the output: `data-adt-id`, selection classes and overlays exist only in the rendered canvas, never in the model.
- `class` is the only attribute with special handling (it becomes `classes: string[]`); on serialize it goes back to `class="a b c"`. With no classes, the attribute is omitted.

### Playground

The playground simulates the workflow: input textarea → editor → output textarea updated by `onChange`, with a "Run round-trip" button that validates the idempotence of the loaded fixture. Real workflow fixtures must go into `src/playground/fixtures/` before Phase 1.

---

## 1. Architecture decisions

| Topic | Decision | Why |
|---|---|---|
| Stack | Vite 8 + React 19 + TS + React Compiler (already configured) | The Compiler removes most manual `memo`/`useCallback`. |
| DnD | `@atlaskit/pragmatic-drag-and-drop` (element adapter) + `-hitbox` + `-auto-scroll` + `-live-region` | Native, no re-render per frame, no provider; preview rendered off the main thread. |
| Document model | Flat normalized map `Record<NodeId, Node>` + `children: NodeId[]` | O(1) lookup, moving a node = 2 splices, per-node subscription, cheap undo through structural sharing. |
| Store | `@tanstack/store` (one `Store<EditorState, EditorActions>` per editor instance) exposed through Context; hooks with `useSelector` | Granular re-render per node; no global state; Compiler-friendly. |
| Transient drag state | Separate store (`dragStore`) + direct `style` writes on the indicator | Drag frames never re-render the tree or the canvas. |
| Canvas | **Same document** (no iframe), `.adt-canvas` subtree, Tailwind CSS generated at runtime inside `@scope (.adt-canvas)` | Keeps tree ↔ canvas ↔ palette in the same `window`, where native DnD works without hacks. An iframe would break pdnd at the boundary. |
| Responsive canvas | Post-process the generated CSS: `@media (width >= X)` → `@container adt-canvas (width >= X)`; `.adt-canvas { container: adt-canvas / inline-size }` | Makes `md:`/`lg:` respond to the canvas width, not the editor window. |
| Tailwind compilation | `tailwindcss` v4 `compile()` running in a **Web Worker**, loaded on demand | Real JIT for any class, off the main thread, without scanning the editor DOM. |
| Class parsing/autocomplete | `__unstable__loadDesignSystem` (same worker): `parseCandidate`, `getClassList` | Single source of truth to group, validate and suggest classes. |
| Class conflicts | `tailwind-merge` | Already resolves `p-4` vs `px-2`, variants, arbitrary values. |
| Editor (UI) styles | CSS Modules + tokens in CSS variables (`--adt-*`) | Zero collision with the consumer's or the canvas's Tailwind; single CSS file in `dist/style.css`. |
| Public API | Compound components + provider (`<HtmlEditor>` / `.Layers` / `.Canvas` / `.Inspector`) | The consumer builds whatever layout it wants; follows `architecture-compound-components`. |
| Build | Vite `build.lib` (ESM), `react`/`react-dom` as peerDependencies, separate playground in `src/playground` | Library and test app in the same repo without mixing. |

### What was discarded

- **Iframe in the canvas**: perfect isolation, but dragging from the tree into the iframe becomes an "external drag" (data only on drop, no hover), and a drag started in the canvas never reaches the parent's pdnd. If it is ever needed, the `CanvasHost` boundary (§3.3) is the only place to swap.
- **`@tailwindcss/browser` via `<script>`**: scans the whole document with a MutationObserver (including the editor UI) and offers no scope control.
- **dnd-kit / react-dnd**: based on pointer events with React state per frame; heavier for large trees.

---

## 2. Folder structure

```
src/
  lib/
    index.ts                      # public exports
    core/
      model.ts                    # Node, NodeId, Document, pure helpers
      store.ts                    # createEditorStore (@tanstack/store) + actions
      history.ts                  # undo/redo (stack of map snapshots)
      html/parse.ts               # HTML string -> Document (DOMParser)
      html/serialize.ts           # Document -> HTML string
      ids.ts
    dnd/
      data.ts                     # symbol type guards: isNodeDrag, isPaletteDrag
      dragStore.ts                # transient state (indicator, current target)
      useNodeDraggable.ts
      useTreeDropTarget.ts        # attachInstruction (tree-item hitbox)
      useCanvasDropTarget.ts      # attachClosestEdge
      useEditorDropMonitor.ts     # single monitor that applies moveNode/insertNode
      preview.tsx                 # setCustomNativeDragPreview
      resolveDrop.ts              # (target, instruction|edge) -> { parentId, index }
    tailwind/
      worker.ts                   # compile(), build(), parseCandidate, getClassList
      client.ts                   # RPC with the worker, debounce, class cache
      scopeCss.ts                 # @scope + media->container rewrite
      categories.ts               # utility families -> Inspector controls
      useCanvasStylesheet.ts      # injects the generated <style>
    components/
      Editor/EditorProvider.tsx
      Layers/{LayersPanel,LayerRow,TreeDropIndicator}.tsx
      Canvas/{Canvas,CanvasNode,SelectionOverlay,CanvasDropIndicator}.tsx
      Inspector/{InspectorPanel,ClassChips,ClassCombobox,VariantBar}.tsx
      Inspector/controls/{Display,Spacing,Sizing,Typography,Color,Border}.tsx
      Palette/{Palette,PaletteItem}.tsx
    styles/tokens.css + *.module.css next to each component
  playground/
    main.tsx, App.tsx, fixtures/*.html
```

---

## 3. Detailed design

### 3.1 Model

```ts
type NodeId = string
type ElementNode = { id; kind: 'element'; tag: string; attrs: Record<string, string>; classes: string[]; parentId: NodeId | null; children: NodeId[] }
type TextNode    = { id; kind: 'text'; value: string; parentId: NodeId }
type CommentNode = { id; kind: 'comment'; value: string; parentId: NodeId }
type OpaqueNode  = { id; kind: 'opaque'; tag: string; attrs: Record<string, string>; classes: string[]; rawInnerHtml: string; parentId: NodeId }
type Envelope    = { kind: 'fragment' } | { kind: 'document'; doctype: string; htmlAttrs: string; head: string; bodyAttrs: string }
type Document    = { rootId: NodeId; nodes: Record<NodeId, AnyNode>; envelope: Envelope }
```

`Envelope` keeps whatever lives outside the body as opaque text, so serialize returns the full document identical outside the edited area (see §0).

Store actions (all immutable, each one produces 1 history entry): `insertNode`, `moveNode(id, parentId, index)`, `removeNode`, `duplicateNode`, `setClasses`, `setAttr`, `setText`, `select`, `toggleCollapsed`, `undo`, `redo`.

`moveNode` validates cycles (the target cannot be a descendant of the source) using a `Set` of ancestors.

Per-node selectors: `useNode(id)` subscribes only to `nodes[id]`; `useChildren(id)` only to `nodes[id].children`. Changing a node's class re-renders a single `CanvasNode` and a single `LayerRow`.

### 3.2 Drag and drop (pdnd)

**Typed data** (`dnd/data.ts`): `Symbol` key + type guard, never a cast.

```ts
{ [nodeKey]: true, nodeId }           // dragging an existing node (tree or canvas)
{ [paletteKey]: true, template }      // dragging from the palette
```

**Sources (`draggable`)**
- `LayerRow`: `element` = the whole row. `getInitialData` with `nodeId`. Custom preview (chip with `<tag>` + class summary) via `setCustomNativeDragPreview` + `pointerOutsideOfPreview`.
- `CanvasNode`: same `draggable`. Never use `canDrag` to block (it cancels the parent's drag); the root node simply does not register a `draggable`.
- `PaletteItem`: `getInitialData` with the template.

**Targets (`dropTargetForElements`)**
- `LayerRow`: `getData` with `attachInstruction` from `@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item` (instructions `reorder-above` / `reorder-below` / `make-child` / `reparent`), `getIsSticky: () => true` to cover gaps between rows, `canDrop` rejects ancestor-into-descendant. *Check the current `attachInstruction` signature in the package docs before implementing.*
- `CanvasNode`: `getData` with `attachClosestEdge`; `allowedEdges` derived from the parent's layout (`flex-row` → `left/right`, otherwise `top/bottom`). Empty containers accept "inside".
- The tree container and `.adt-canvas` are stable fallback targets: they guarantee a real `drop` event even when the dragged row was unmounted (virtualization).

**Single monitor** (`useEditorDropMonitor`, in the provider): `canMonitor` filters through the type guards; `onDrop` reads `location.current.dropTargets[0]`, calls `resolveDrop` and dispatches `moveNode`/`insertNode`. No individual target mutates the store.

**Indicators**: one `TreeDropIndicator` component and one `CanvasDropIndicator`, both positioned from the target's `getBoundingClientRect`, updated by `onDropTargetChange` through `dragStore`. Only the indicator re-renders; rows do not. "Dragging" feedback on the source via `data-state` and CSS.

**Auto-scroll**: `autoScrollForElements` on the tree scroller and on the canvas.

**Accessibility**: keyboard moves (`Alt+↑/↓` reorders, `Alt+←/→` reparents) and announcements with `-live-region`.

### 3.3 Canvas

- `Canvas` renders `CanvasNode(rootId)` recursively inside `.adt-canvas`. Each `CanvasNode` creates the real element (`createElement(tag)`) with `className={classes.join(' ')}` and `data-adt-id`.
- Hover and selection: **one** absolute `SelectionOverlay` (not a border per node), repositioned with `ResizeObserver` + canvas `scroll`. Hover through delegated `pointerover` on the container (reads the closest `data-adt-id`).
- `CanvasHost { root: HTMLElement; elementFromPoint; getRect }` interface — the only coupling point should the canvas ever move into an iframe.
- `useCanvasStylesheet`: collects the document's class `Set` (kept incrementally in the store), sends it to the worker only when new classes appear, injects the returned CSS in `<style data-adt-canvas>`.

### 3.4 Tailwind worker

- Input: `compile()` of a CSS with `@layer theme, base, utilities`, importing `tailwindcss/theme.css`, `tailwindcss/preflight.css` and `tailwindcss/utilities.css` into their layers, plus `@custom-variant dark (&:where(.adt-dark, .adt-dark *))`. `loadStylesheet` resolves the package's `.css` files through `?raw` imports.
- Messages: `build(candidates: string[]) → css`, `parse(className) → { root, value, variants, valid }`, `classList() → string[]`.
- `scopeCss`: wraps in `@scope (.adt-canvas)` and rewrites breakpoint media queries into container queries.
- Lazy loading (only when the first `<Canvas>` mounts); results cached per class.

### 3.5 Inspector (Tailwind mode)

- `VariantBar`: base | sm | md | lg | xl | hover | focus | dark. Every control applies the active prefix.
- `ClassChips`: the node's class list, filtered by the active variant, with remove and reorder.
- `ClassCombobox`: free input with autocomplete (`getClassList` + `useDeferredValue` on the filter); Enter applies through `twMerge`.
- Controls per family (`categories.ts` maps family → control): Display, Flex/Grid, Spacing (`p/m/gap` with scale + arbitrary), Sizing, Typography, Color (bg/text/border with the theme palette), Border/Radius, Effects. Each control reads the current value via `parseCandidate` and writes with `twMerge(existing, next)`.
- Inline text editing in the canvas (`contentEditable` on the selected `TextNode`, commit on blur).
- `StyleAdapter` interface (`tailwind` now, `inline-css` later) for the plain CSS mode.

### 3.6 Public API

```tsx
<HtmlEditor defaultValue={html} onChange={(html) => ...} styleMode="tailwind">
  <HtmlEditor.Layers />
  <HtmlEditor.Canvas />
  <HtmlEditor.Inspector />
</HtmlEditor>

<HtmlEditor.DefaultLayout defaultValue={html} onChange={...} />   // 3-panel shortcut
```

Full input/output contract (`value`, `onChange`, `ref.getHtml()`, formats) in §0.

Also exported: `parseHtml`, `serializeHtml`, `useEditor()` (headless), types. `parseHtml`/`serializeHtml` are pure and can be used by the workflow outside React (e.g. to validate or pre-process the HTML before opening the editor).

---

## 4. Performance rules (applied in every phase)

- Drag frames never go through a list `setState`: indicator and overlay write `style` directly (`rerender-use-ref-transient-values`).
- Per-node store, primitive selectors, `functional setState` (`rerender-*`).
- `getData`/`canDrop` pure and cheap; ancestors computed with `once` at drag start.
- pdnd imports only through entry points; Tailwind worker and `tailwind-merge` loaded lazily (`bundle-*`).
- Tree rows and canvas nodes with `content-visibility: auto`; tree virtualization (`@tanstack/react-virtual`) once the visible list exceeds ~300 rows.
- `startTransition` when applying classes from the combobox; `useDeferredValue` on the autocomplete filter.
- No components defined inside components; no internal barrel `index.ts` besides the public one.
- Budget: 2,000 nodes, drag at 60 fps, applying a class → visible CSS in < 50 ms, `npx react-doctor` without regressions (Stop hook already configured).

---

## 5. Phases

### Phase 0 — Foundation (1 day)
- [x] Install: `@atlaskit/pragmatic-drag-and-drop`, `-hitbox`, `-auto-scroll`, `-live-region`, `@tanstack/store`, `@tanstack/react-store`, `tiny-invariant`, `tailwindcss`, `tailwind-merge`; dev: `vitest`, `@testing-library/react`, `@atlaskit/pragmatic-drag-and-drop-unit-testing`, `@tanstack/react-virtual` (phase 6).
- [x] Reorganize `src/` into `lib/` and `playground/`; `vite.config.ts` with `build.lib`; `package.json` with `exports`, `peerDependencies`, `files`.
- [x] `tokens.css`, light/dark theme, remove template assets.
- **Done when**: `bun run build` produces `dist/index.js` + `dist/style.css`; the playground runs.

### Phase 1 — Document core (1–2 days)
- [x] `model.ts`, `store.ts` with every action, `history.ts`.
- [x] `parse.ts`: fragment and full document (envelope), `comment` and `opaque` nodes, insignificant whitespace dropped, `class` → `classes`.
- [x] `serialize.ts`: built through the DOM (`innerHTML`) for correct escaping; envelope re-emission; opaque `rawInnerHtml` byte for byte.
- [x] `EditorProvider` with `value`/`defaultValue`/`onChange`/`ref` (§0), still without UI.
- [x] Unit tests: move with cycle, undo/redo, round-trip idempotence on every fixture, DOM equivalence (`isEqualNode`) between input and output, no `data-adt-*` in the output.
- **Done when**: 100% of the actions tested without UI and every real workflow fixture passes the round-trip.

### Phase 2 — Layers panel + DnD (the main milestone, 3–4 days)
- [x] `LayersPanel` with flat rows derived from the document (respecting collapsed), indentation per level, expand/collapse, selection.
- [x] `useNodeDraggable`, `useTreeDropTarget` with `attachInstruction`, `TreeDropIndicator`, custom preview, stickiness.
- [x] `useEditorDropMonitor` + `resolveDrop` (every instruction).
- [x] Auto-scroll, keyboard, live region.
- [x] `resolveDrop` tests against the real `-hitbox` package (the `-unit-testing` package only ships polyfills) + native drag verified in the browser.
- **Done when**: reordering/reparenting in a 1,000-node tree without a frame > 16 ms (measured with `react-doctor scan`).

### Phase 3 — Canvas (3 days)
- [x] `Canvas`, `CanvasNode`, `SelectionOverlay` (hover + selection), click selects and syncs with the tree (scroll into view).
- [x] Tailwind worker + `scopeCss` + `useCanvasStylesheet`; responsive variants through container queries; dark toggle.
- [x] `useCanvasDropTarget` with closest-edge and "inside"; `CanvasDropIndicator`; drag started in the canvas.
- [x] Canvas width control (mobile/tablet/desktop presets).
- **Done when**: dropping from the tree into the canvas and back works with the correct indicator; `md:flex` reacts to the canvas width.

### Phase 4 — Tailwind Inspector (3 days)
- [x] `VariantBar`, `ClassChips`, `ClassCombobox` with autocomplete.
- [x] `categories.ts` + controls (Display, Flex/Grid, Spacing, Sizing, Typography, Color, Border, Effects).
- [x] Conflict resolution with `tailwind-merge`; current value read via `parseCandidate`.
- [x] Basic attributes (`id`, `href`, `src`, `alt`) and inline text editing.
- **Done when**: any valid class can be applied through a control or as text and shows in the canvas in < 50 ms.

### Phase 5 — Palette and operations (2 days)
- [x] `Palette` with templates (div, section, h1–h6, p, img, button, a, ul/li) draggable into tree and canvas.
- [x] Delete, duplicate, copy/paste (internal clipboard), shortcuts (Del, Ctrl+D, Ctrl+Z/Y).
- [ ] External text/HTML drop with `dropTargetForExternal` (optional).

### Phase 6 — Performance (2 days)
- [x] Virtualize the tree (own fixed-height window, without `@tanstack/react-virtual`); stable drop target on the container.
- [x] Profile with `npx react-doctor scan` on a 2,000-node document; fix hot paths.
- [x] Full `npx react-doctor --verbose`, score ≥ 90.

### Phase 7 — Hardening and packaging (2 days)
- [x] Audit with web-design-guidelines (visible focus, contrast, targets ≥ 24 px, `prefers-reduced-motion`, labels).
- [x] `StyleAdapter` for plain CSS (skeleton + basic `style` controls).
- [x] Library usage README.
- [ ] Test real consumption via `file:` in the other project (needs the other repo).

---

## 6. Risks and spikes (do them before the phases that depend on them)

| Risk | Impact | Mitigation / spike |
|---|---|---|
| `hitbox/tree-item` API different from what is remembered | Phase 2 | 1 h spike reading the installed package docs before coding `useTreeDropTarget`. |
| `tailwindcss` `compile()` in the browser/worker (resolution of internal `.css`, ~300 KB) | Phase 3 | 2 h spike: minimal worker compiling `["flex","p-4","md:grid"]`. If it fails, plan B: `@tailwindcss/browser` restricted to `.adt-canvas` by forking the scanner. |
| `@media` → `@container` rewrite letting variants slip (`max-md:`, `min-[...]`) | Phase 3 | Cover with snapshot tests of the generated CSS. |
| `@scope` unsupported in the consumer's target browser | Phase 3 | Check the target; fallback: prefix selectors with `.adt-canvas ` through a rewrite. |
| `DOMParser` normalizes invalid or loose HTML (closes implicit `<p>`, inserts `<tbody>`, reorders `<head>`/`<body>`) and the output diverges from the input | Phase 1 and the workflow | Run the real fixtures early; document that the output is equivalent valid HTML. If the workflow requires preserving non-normalized HTML, switch to a tolerant parser (`parse5`) on parse. |
| Native DnD on touch | General | Accepted for v1 (desktop-first); evaluate a polyfill later. |
| React Compiler + pdnd effects | Phase 2 | Effects with minimal deps (`nodeId`), cleanup always returned; remount mid-drag is safe through reconciliation. |

---

## 7. Out of scope (v1)

npm publishing, real-time collaboration, `<head>`/script editing, reusable components (symbols), full plain CSS mode, touch support.
