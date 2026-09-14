# adt-html-editor

React library for visual HTML editing: element tree, canvas and Tailwind style panel. It takes an HTML string, the user edits it, and it returns an HTML string.

Consumed via `file:` / `bun link` — not published to npm.

## Installation

```bash
bun add file:../adt-html-editor
```

`react` and `react-dom` (>= 19) are peer dependencies.

```tsx
import { HtmlEditor } from 'adt-html-editor'
import 'adt-html-editor/style.css'
```

## Usage

### Ready-made layout (3 panels)

```tsx
<HtmlEditor.DefaultLayout defaultValue={html} onChange={(next) => setHtml(next)} />
```

### Picking the panels

Each panel is independent. Use only the ones you want, in whatever arrangement you want:

```tsx
<HtmlEditor defaultValue={html} onChange={(next) => setHtml(next)}>
  <HtmlEditor.Layout>
    <HtmlEditor.Palette />
    <HtmlEditor.Layers />
    <HtmlEditor.Canvas />
    <HtmlEditor.Inspector />
  </HtmlEditor.Layout>
</HtmlEditor>
```

Only `<HtmlEditor>` is required — it creates the instance store. `<HtmlEditor><HtmlEditor.Inspector /></HtmlEditor>` works on its own, and `HtmlEditor.Layout` is optional (use your own grid).

### Customizing the inside of each panel

Each panel is a `Root` that accepts `children`. **Without children it renders the default composition; with children, you control everything** — which parts exist, in what order, and with which labels.

```tsx
<HtmlEditor defaultValue={html} onChange={setHtml}>
  <MyLayout>
    <HtmlEditor.Layers>
      <HtmlEditor.Layers.Header>
        <HtmlEditor.Layers.Title>Structure</HtmlEditor.Layers.Title>
        <HtmlEditor.Layers.Count />
      </HtmlEditor.Layers.Header>
      <HtmlEditor.Layers.Search placeholder="Filter…" />
      <HtmlEditor.Layers.Tree />
    </HtmlEditor.Layers>

    <HtmlEditor.Canvas>
      <HtmlEditor.Canvas.Viewport />
      <HtmlEditor.Canvas.Toolbar>
        <HtmlEditor.History>
          <HtmlEditor.History.Undo>↶</HtmlEditor.History.Undo>
          <HtmlEditor.History.Redo>↷</HtmlEditor.History.Redo>
        </HtmlEditor.History>
        <HtmlEditor.Canvas.DarkToggle>Dark theme</HtmlEditor.Canvas.DarkToggle>
        <HtmlEditor.Canvas.WidthPresets
          presets={[
            { id: 'narrow', label: '360', width: 360 },
            { id: 'fluid', label: 'Fluid', width: 0 },
          ]}
        />
      </HtmlEditor.Canvas.Toolbar>
    </HtmlEditor.Canvas>

    <HtmlEditor.Inspector>
      <HtmlEditor.Inspector.Header />
      <HtmlEditor.Inspector.Empty>Nothing selected.</HtmlEditor.Inspector.Empty>
      <HtmlEditor.Inspector.Variants />
      <HtmlEditor.Inspector.Body>
        <HtmlEditor.Inspector.Section title="Shortcuts">
          <HtmlEditor.Inspector.Control id="display" />
          <HtmlEditor.Inspector.Control id="gap" />
        </HtmlEditor.Inspector.Section>
        <HtmlEditor.Inspector.Category id="typography" />
      </HtmlEditor.Inspector.Body>
    </HtmlEditor.Inspector>
  </MyLayout>
</HtmlEditor>
```

`src/playground/CustomLayout.tsx` is a complete example — the playground toggles between it and the default layout.

### Available parts

| Panel | Parts |
|---|---|
| `HtmlEditor.Layers` | `Header`, `Title`, `Count`, `Search`, `Tree`, `Row`, `Empty` |
| `HtmlEditor.Canvas` | `Toolbar`, `WidthPresets`, `DarkToggle`, `Viewport`, `FixedPage`, `Zoom`, `Guides`, `LiveGhost`, `ImageGhost`, `Handles` (`Handles.Resize`, `Handles.Rotate`) |
| `HtmlEditor.Inspector` | `Header`, `Empty`, `Variants`, `Body`, `Section`, `Category`, `Control`, `ClassInput`, `ClassList`, `Attributes`, `Position`, `Transform` |
| `HtmlEditor.Palette` | `Header`, `Grid`, `Item` |
| `HtmlEditor.History` | `Undo`, `Redo` |

`HtmlEditor.History` does not depend on any panel: place it in any toolbar inside `<HtmlEditor>`. Without children it renders `Undo` + `Redo`; with children you choose labels, order and extra parts (a counter, for example). To write your own buttons use `useHistory()` → `{ canUndo, canRedo, undo, redo }`. The `Ctrl/⌘+Z` and `Ctrl/⌘+Shift+Z` (or `Ctrl+Y`) shortcuts keep working regardless of the buttons.

`Category` and `Control` take an `id` from the exported `CATEGORIES` — categories: `layout`, `flex`, `spacing`, `sizing`, `typography`, `color`, `border`, `effects`; controls: `display`, `gap`, `p`, `text-size`, etc.

To change the look of the tree rows without losing drag and drop, pass `renderRow` to `Tree` and build your row around `HtmlEditor.Layers.Row`.

`HtmlEditor.Layers.Search` filters the tree. A query matches tag, id, classes and text; `#hero` and `.flex` restrict the match to id or class, and several words must all match. Ancestors of a match stay visible so the structure reads correctly, rendered muted (`data-muted` on the row, `isMatch: false` in `LayerRowInfo`). While a query is active, collapsed state is ignored, `Count` shows the number of matches and `Empty` reports when nothing matched. `Esc` clears the query; `↓` or `Enter` jump into the tree. The search state lives in the `Layers` root, so any part inside it can read `useLayersContext()` → `{ rows, state: { query, isSearching, matchCount }, actions: { setQuery, clearSearch, focusTree, focusSearch }, meta: { registerSearch, registerTree } }` to build its own input or match counter (pass `meta.registerSearch` as the `ref` of a custom input so `focusSearch` keeps working).

Each part is also exported standalone (`LayersTree`, `InspectorCategory`, `CanvasViewport`, `HistoryGroup`…), and the contexts are accessible via `useLayersContext()`, `useInspectorContext()`, `useCanvasContext()` and `useHistory()` if you need to write your own parts.

## Input and output contract

```tsx
const editor = useRef<HtmlEditorHandle>(null)

<HtmlEditor
  defaultValue={html}            // uncontrolled
  value={html}                   // or controlled: reparses when changed from outside
  onChange={(html, doc) => {}}
  changeDebounceMs={0}
  handleRef={editor}             // editor.current.getHtml() / setHtml() / getDocument()
/>
```

- `onChange` fires on every committed action (drop, class applied, attribute, text on leaving `contentEditable`, undo/redo). Never per drag frame nor per typed key.
- `getHtml()` can be called at any time (e.g. the workflow's "Done" button).
- `value` changing from outside replaces the whole document and clears history and selection.

### Accepted formats

| Input | How it is handled | Output |
|---|---|---|
| Fragment (`<section>…</section><p>…</p>`) | Direct children become children of the virtual root node | Fragment |
| Full document | Edits only the content of `<body>`; `<!doctype>`, `<html>` attrs, the whole `<head>` and `<body>` attrs are stored as opaque text | Full document, with `<head>` identical to the original |

Detection is based on the presence of `<html`, `<head` or `<body` in the input.

### Fidelity guarantees

- **DOM equivalence, not byte equivalence.** `serialize(parse(html))` produces HTML whose DOM equals the input's; the original indentation between blocks is not preserved. The round-trip is idempotent: `serialize(parse(serialize(parse(x)))) === serialize(parse(x))`.
- Preserved: all attributes in their original order, class order, unknown tags and custom elements, HTML comments, entities.
- `<script>`, `<style>`, `<svg>`, `<math>`, `<iframe>`, `<template>`, `<noscript>` are **opaque nodes**: they show up in the tree, can be moved and removed, do not accept children, and their inner content is re-emitted **byte for byte**.
- Whitespace-only text nodes between block elements are dropped during parsing. Whitespace adjacent to inline elements is kept. `<pre>` and `<textarea>` preserve whitespace in full.
- Nothing from the editor leaks into the output: `data-adt-id`, overlays and indicators exist only in the rendered DOM.

In the canvas, the content of opaque nodes goes through a sanitizer (removes `on*`, `<script>`, `javascript:` urls) **only for the preview** — the model and the output remain byte for byte.

## Headless API

```ts
import { parseHtml, serializeHtml, createEditorStore } from 'adt-html-editor'

const doc = parseHtml(html)      // pure, usable outside React
const out = serializeHtml(doc)
```

Also exported: `useEditor()`, `useNode()`, `useChildren()`, `useDocument()`, `useEditorSelector()` and the model types.

## Drop zones in the canvas

Each canvas element has two zones:

- **Edge strip** (16 px, or 30% of the size on small elements) — inserts as a sibling before/after. The axis follows the parent's layout: `left`/`right` in flex-row, `top`/`bottom` elsewhere.
- **Center** — inserts *inside*, when the element accepts nesting: it can have children and is either empty or already has at least one element child. A `<p>Text</p>` or an `<h1>` with only text does **not** accept it, so the edge strip covers the whole element.

Inside a container, the exact position comes from comparing the pointer with the midpoint of each child — dropping in the gap between two children inserts between them.

When an existing element is dragged, its **current parent takes priority** so reordering among siblings is easy:

- Over a sibling (or anything inside it), a **wide band** (40% of the sibling on the parent's axis, at least 24 px) means "before/after that sibling". Only the sibling's core still nests into it, or into a deeper container under the pointer.
- Over the parent's own padding or edges, the drop stays inside the parent, at the position closest to the pointer. Moving out of the parent is done by hovering another element outside it.

Palette drags keep the plain zones above. The indicator is drawn by a single monitor from the target chosen this way, so it shows exactly where the element will land.

## Fixed layout mode

For fixed-layout books (EPUB FXL and similar), where the page has fixed dimensions and elements are absolutely positioned, the editor switches to a second behaviour:

```tsx
<HtmlEditor layout="auto" fixedLayout={{ resolveAsset: (url) => `${cdn}/${url}` }}>
  <HtmlEditor.Canvas>
    <HtmlEditor.Canvas.Toolbar>
      <HtmlEditor.History />
      <HtmlEditor.Canvas.Zoom />
    </HtmlEditor.Canvas.Toolbar>
    <HtmlEditor.Canvas.FixedPage>
      <HtmlEditor.Canvas.Guides />
      <HtmlEditor.Canvas.LiveGhost />   {/* or <HtmlEditor.Canvas.ImageGhost /> */}
      <HtmlEditor.Canvas.Handles />     {/* or <Handles><Handles.Resize /></Handles> without rotation */}
    </HtmlEditor.Canvas.FixedPage>
  </HtmlEditor.Canvas>
  <HtmlEditor.Inspector>
    <HtmlEditor.Inspector.Position />
    <HtmlEditor.Inspector.Transform />
  </HtmlEditor.Inspector>
</HtmlEditor>
```

- **Activation.** `layout="auto"` (default) picks `fixed` when the document has `<meta name="viewport" content="width=…, height=…">` in its `<head>`, or when at least 80% of the page container's children are absolutely positioned inline. `layout="fixed"` / `"flow"` force it. `DefaultLayout` follows the resolved mode.
- **Page.** `Canvas.FixedPage` renders the page at its declared size, scaled by `Canvas.Zoom` (fit, 50, 100, 200%). The stylesheet from the document `<head>` (`<style>` and, with `resolveAsset`, `<link rel="stylesheet">`) is applied to the page with the same scoping used for Tailwind; `html`/`body`/`:root` selectors map to the page, `@font-face` stays global, `@page` is dropped.
- **Dragging.** Elements move freely with 1 px precision (`fixedLayout.precision`). Coordinates are always converted to page units, so zoom and scroll never change the result. Smart guides snap to sibling edges and centers and to the page (`fixedLayout.snapThreshold`, in screen px; hold `Alt` to disable). Arrow keys nudge by 1 px, `Shift` + arrows by 10 px.
- **Same level on drop.** Dropping an element, even one nested inside a group, places it as a child of the **page container** (the single top-level wrapper, or the body) and writes `position: absolute; left; top` in px into its `style`, removing `right`/`bottom`. Typography that would change by leaving a styled parent (font, size, line height, color, alignment) is copied inline first. By default the element goes to the end of the container (on top); `fixedLayout.keepStacking: true` inserts it right after its former top-level ancestor. `fixedLayout.pageContainer` overrides the container choice.
- **Ghost strategies.** `Canvas.ImageGhost` uses the native drag preview: a rasterized clone of the element follows the pointer off the main thread while an outline marks the snapped destination. `Canvas.LiveGhost` (the default) disables the native preview and moves a live copy of the element in an overlay, so snapping and guides are exact at any zoom; cancelling animates it back. Both implement `GhostStrategy`, exported for custom ones.
- **Inspector.** `Inspector.Position` shows X, Y, W, H (measured from the rendered page), stacking-order buttons (the tree order is the paint order) and a position lock that disables dragging for that element. The lock lives in editor state, not in the HTML.
- **Resize and rotate.** `Canvas.Handles` draws the selected element's layout box (not its bounding box, so rotated elements get a rotated frame) with eight resize handles and a rotate handle; `Canvas.Handles.Resize` and `Canvas.Handles.Rotate` can be composed separately. Gestures use pointer events, preview directly on the element so text reflows live, and commit once on release (`width`/`height`/`left`/`top` in px, or `transform: rotate()` appended to the existing `transform` list). `Shift` keeps the aspect ratio or snaps the angle to 15°, `Alt` resizes from the center or disables snapping, `Esc` cancels. Edges snap to sibling and page guides when the element is not rotated; angles within 1° of a right angle stick. Resizing an inline element writes `display: inline-block`. Handles are hidden for locked elements and disabled inside transformed ancestors (drag the element to the page first). `Inspector.Transform` shows the angle, a reset button, an aspect-ratio lock shared with the handles and the W/H fields, and an "Auto height" toggle that removes `height`.
- **Output.** Only `style` attributes and node parents change, so all fidelity guarantees above hold. Palette drops and tree-to-page drops use the same placement.

## shadcn skin

The same editor with [shadcn/ui](https://ui.shadcn.com) chrome ships as a second entry point, `adt-html-editor/shadcn`. The main entry stays dependency-free: the skin's libraries are optional peers that your bundler only pulls in when you import the subpath.

```bash
bun add @base-ui/react lucide-react class-variance-authority cn cmdk react-resizable-panels
```

```css
/* your global CSS (Tailwind v4) */
@import 'tailwindcss';
@import 'shadcn/tailwind.css';
@source '../node_modules/adt-html-editor/dist';
/* plus the shadcn theme tokens from `shadcn init` (--background, --primary, …) */
```

```tsx
import 'adt-html-editor/style.css'
import { HtmlEditor } from 'adt-html-editor/shadcn'

<HtmlEditor.DefaultLayout defaultValue={html} onChange={setHtml} />
```

- **Same parts, same names.** `HtmlEditor.Layers`, `Canvas`, `Inspector`, `Palette`, `History`, `Layout` and `DefaultLayout` exist on both entries with the same sub-parts, so switching skins is a one-line import change. Canvas internals that live inside the page (`FixedPage`, `Guides`, `LiveGhost`, `ImageGhost`, `Handles`, `Viewport`) are re-exported from the core.
- **Headless core.** Every skin part is a thin view over a core hook (`useLayerRow`, `useLayersSearch`, `useHistory`, `useZoom`, `useWidthPresets`, `useDarkToggle`, `useVariantBar`, `useClassEditing`, `useClassSuggestions`, `useStyleControl`, `useAttributeFields`, `usePositionFields`, `useTransformFields`, `usePaletteDraggable`) and the `LayersProvider`, `CanvasProvider` and `InspectorProvider` contexts, all exported from the main entry. Write your own skin the same way.
- **Base UI.** Components are generated by the shadcn CLI (`components.json`, style `base-nova`) on top of `@base-ui/react`; `src/shadcn/ui` is updated through `shadcn add --diff`, never edited by hand.
- **Styling.** The skin has no CSS of its own: your Tailwind compiles its classes (hence the `@source` line) and your theme tokens color it. `adt-html-editor/style.css` is still required for the selection overlay, ghosts, guides and resize handles, which live inside the page and do not depend on your Tailwind. The skin root carries `adt-editor` only for those `--adt-*` tokens; the core's chrome rules (fonts, focus outline, panel colors) live on `adt-chrome`, which the skin never applies, so nothing in `style.css` overrides shadcn classes.
- **Guarantee.** A build test walks the import graph of `dist/index.js` and fails if any skin dependency becomes reachable from the core entry.

### Style sections

The skin inspector renders property-oriented sections instead of raw class toggles: **Layout** (display, direction, justify, align, gap), **Spacing** (padding and margin as one value or four sides), **Sizing** (width and height with a unit picker, optional min/max fields behind a `+` button), **Typography** (family, size with a token picker, weight, style, align, leading, colour), **Appearance** (background, opacity slider, shadow) and **Borders** (width, radius per corner, colour).

- **Inputs commit while you type.** Numeric fields keep a local draft, write the class 200 ms after the last keystroke, flush on blur or `Enter` and revert on `Escape`. Each write updates one node and compiles only the new classes in the Tailwind worker.
- **Variants cascade.** With `md` selected, a field shows the value from `md:`, then `sm:`, then the base class. Writing a value that equals the fallback removes the override instead of adding a redundant class. Labels of overridden fields turn into a badge with a popover listing both levels and a reset action (`Ctrl`/`⌘`+click resets directly).
- **Inherited values are marked.** Where no class sets a property, the field shows the computed value from the canvas with a dot and a tooltip.
- **Class maps are headless.** Every section is built on `useClassMapControl(id, classMap, fallback, variant)` from the main entry, with pure `ClassMap` objects (`paddingClassMap`, `widthClassMap`, `fontSizeClassMap`, `backgroundColorClassMap`, …) that translate between a control value and Tailwind classes. `useOptionalFields` and `useComputedStyles` back the `+` menu and the inherited indicators. Reuse them to build sections for other properties, or use the exported controls (`NumericInput`, `UnitInput`, `TokenInput`, `BoxInput`, `ColorInput`, `StyleSelect`, `StyleRow`, `StyleSection`, `AddFieldButton`) with your own maps.

```tsx
import { HtmlEditor } from 'adt-html-editor/shadcn'

<HtmlEditor.Inspector>
  <HtmlEditor.Inspector.Header />
  <HtmlEditor.Inspector.Variants />
  <HtmlEditor.Inspector.Body>
    <HtmlEditor.Inspector.Typography />
    <HtmlEditor.Inspector.Spacing />
    <HtmlEditor.Inspector.Section title="Classes">
      <HtmlEditor.Inspector.ClassInput />
      <HtmlEditor.Inspector.ClassList />
    </HtmlEditor.Inspector.Section>
  </HtmlEditor.Inspector.Body>
</HtmlEditor.Inspector>
```

## Shortcuts

| Key | Action |
|---|---|
| `↑` / `↓` | Navigate the tree |
| `←` / `→` | Collapse/expand, or go up/down one level |
| `Alt+↑` / `Alt+↓` | Reorder among siblings |
| `Alt+←` | Move out (reparent) |
| `Alt+→` | Move into the previous sibling |
| `Del` / `Backspace` | Remove |
| `Ctrl/Cmd+D` | Duplicate |
| `Ctrl/Cmd+C` / `X` / `V` | Copy / cut / paste (internal clipboard) |
| `Ctrl/Cmd+Z` / `Shift+Z` / `Ctrl+Y` | Undo / redo |
| `Enter` (in the canvas) | Edit text inline |
| `Esc` | Cancel editing / clear selection |
| `↑` `↓` `←` `→` (fixed layout) | Nudge by 1 px (`Shift` = 10 px) |
| `Ctrl/Cmd+arrows` (fixed layout) | Resize by 1 px (`Shift` = 10 px) |
| `[` / `]` (fixed layout) | Rotate by 1° (`Shift` = 15°) |

## Tailwind in the canvas

The CSS is compiled at runtime by `tailwindcss` v4 running in a **Web Worker** (loaded on demand when the first `<Canvas>` mounts). Only the classes present in the document are compiled.

The generated CSS is isolated in `@scope (.adt-canvas)` — with a selector-prefixing fallback in browsers without `@scope`. Breakpoint media queries are rewritten to container queries:

```
@media (width >= 48rem)  →  @container adt-canvas (width >= 48rem)
```

That is, `sm:` / `md:` / `lg:` respond to the **canvas width**, not the editor window's. Feature media queries (`hover`, `prefers-color-scheme`, …) are not rewritten.

Class conflicts are resolved with `tailwind-merge`. The canvas dark mode uses the `dark:` variant bound to the `.adt-dark` class.

## Development

```bash
bun run dev          # playground at http://localhost:5173
bun run test         # vitest
bun run typecheck    # tsc -b
bun run lint         # oxlint
bun run build        # dist/index.js + dist/style.css + dist/index.d.ts
```

The playground (`src/playground`) simulates the workflow: input textarea → editor → output textarea updated via `onChange`, with a round-trip validation button. Fixtures live in `src/playground/fixtures`.

## Known limitations (v1)

- Drag and drop uses the native HTML5 API: **desktop-first**, no touch support.
- The canvas renders in the same document (no iframe). A `<style>` inside the edited HTML could affect the editor UI — that is why `<style>` is rendered as an inert placeholder in the canvas.
- `DOMParser` normalizes invalid HTML (closes implicit `<p>`, inserts `<tbody>`). The output is equivalent valid HTML, not the original un-normalized one.
- No `<head>` editing, no real-time collaboration, no reusable symbols/components.
- Pure CSS mode (`styleMode="inline-css"`) has only the adapter (`StyleAdapter`), no dedicated controls.
