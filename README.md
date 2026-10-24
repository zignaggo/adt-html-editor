<p align="center">
  <img src="public/logo-wordmark.svg" alt="adt-html-editor" width="340">
</p>

React library for visual HTML editing: element tree, canvas and Tailwind style panel. It takes an HTML string, the user edits it, and it returns an HTML string.

Consumed via `file:` / `bun link` — not published to npm.

## Installation

```bash
bun add file:../adt-html-editor
```

`react` and `react-dom` (>= 19) are peer dependencies. Every `react` subpath is
external, including `react/compiler-runtime`, so the consuming app's own React
is the only one in the bundle. The Tailwind worker is inlined into the bundle:
no asset from `dist/assets` has to be served.

```tsx
import { HtmlEditor } from 'adt-html-editor'
import 'adt-html-editor/style.css'
```

`style.css` is self-contained: the chrome is written in Tailwind classes and the
build compiles them into it, so an app without Tailwind gets the editor fully
styled. It ships no preflight — the only global rule is a `box-sizing: border-box`
scoped to `.adt-chrome` — so it never resets the host app.

### Theming

The chrome is written against the shadcn token names (`--background`,
`--foreground`, `--muted`, `--primary`, `--border`, `--ring`, `--radius`, …).
`style.css` declares a default for each of them inside `@layer theme` — the
product palette, blue `--primary` and all — so an app that already defines them
in an unlayered `:root` (anything produced by `shadcn init`) wins and the editor
takes that app's colors with no extra configuration. Adding `dark` to an ancestor
switches the editor to the dark set, and `color-scheme` follows on `.adt-editor`
so native scrollbars and form controls match.

The chrome also follows shadcn/ui’s own component vocabulary — the same radii, control
heights, borders, hover states and focus rings — so the built-in look sits next to shadcn
components without a seam, and the two entry points differ in markup, not in style.

The `--sidebar-*`, `--chart-*` and `--brand-*` ramps are declared and registered
as Tailwind namespaces (`bg-sidebar`, `text-brand-600`, …) even though the core
chrome does not use them yet, so a skin built on top of the same tokens gets them
for free.

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

## Context menu

Right-clicking an element in the canvas selects it and opens the menu. **`Canvas.Viewport` and `Canvas.FixedPage` render it themselves**, so any composition built on either gets it with nothing to wire — in flow and in fixed mode alike. `Canvas.ContextMenu` is exported for a canvas that uses neither; mounting it next to a viewport renders the menu twice.

- **Selection.** Right-clicking an element that is not selected selects it first. One that is already part of a multi-selection keeps it, so the menu acts on everything selected. Right-clicking the grey area around the page opens nothing and leaves the browser's own menu alone.
- **Actions.** Duplicate, Delete · Copy, Paste · Copy style, Paste style · Select parent, Lock. Copy and paste carry the element itself, through the same clipboard the editor uses elsewhere; paste drops it in as the next sibling of the selection. Copy style carries the classes and the inline `style` of a single element, and pastes them onto every element selected, in one history entry.
- **What is offered.** An entry that does not apply is disabled rather than hidden, so the menu keeps its shape: nothing to paste yet, a selection with the root in it, a locked element, or an element already at the top level. `menuActionsFor` is the pure function that decides, and `useContextMenu` is the headless half if you want to render your own menu.
- **Dismissal.** Escape, a click outside, a scroll, a resize or the window losing focus. Arrow keys move between the entries.

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

## Flow layout controls

In flow mode the selected element can be edited straight on the canvas, without going to the inspector:

```tsx
<HtmlEditor layout="flow" flowLayout={{ directControls: true }}>
  <HtmlEditor.Canvas>
    <HtmlEditor.Canvas.Toolbar>
      <HtmlEditor.History />
      <HtmlEditor.Canvas.WidthPresets />
    </HtmlEditor.Canvas.Toolbar>
    <HtmlEditor.Canvas.Viewport>
      <HtmlEditor.Canvas.FlowControls />
      <HtmlEditor.Canvas.FlowToolbar />
    </HtmlEditor.Canvas.Viewport>
    <HtmlEditor.Canvas.FlowStatusBar />
  </HtmlEditor.Canvas>
  <HtmlEditor.Inspector />
</HtmlEditor>
```

- **Activation.** `flowLayout.directControls` is off by default, because it takes the pointer: while it is on, the node's native drag is routed to the gestures instead of to the tree-and-palette drag. `Canvas.Viewport` takes children, rendered as an overlay above the page in host coordinates, so `Canvas.FlowControls` is one of several possible overlays.
- **When it engages.** Exactly one element selected, no text being edited, not the root, and nothing locked at it or above it.
- **Gestures.** The handles on the selection are always live: the four corners resize between 10% and 100% of the parent's content width, the blue handle sets the height, and the amber one sets the space below, from 0 to 96 px in steps of 4. **The element itself takes the pointer only while a mode is on** — Reposition or free transform — so a drag across the canvas never moves something the user did not ask to move, and the grab cursor only appears when there is something to grab. Aligning and reordering are the toolbar's buttons: align left / centre / right, move earlier / later.
- **Dragging the element directly.** `useFlowGestures` still exposes `startMove`, the axis-locked gesture that aligns sideways and reorders vertically (with a guide line, and consecutive text and inlines treated as one target). Nothing in the shipped canvas binds it; a consumer who wants drag-to-align can bind it to the element themselves.
- **Box model on the selection.** The overlay shades the selected element's own space: an amber band outside the border box for the margin and an emerald one inside it for the padding, each drawn only on the sides that have room. Both follow a gesture live, so dragging the amber handle shows the margin growing before it is committed.
- **Everything is a class.** A gesture previews on the element's inline style and commits Tailwind classes — `w-[60%]`, `mb-6`, `mx-auto`, `text-right` — so the inspector reads the same value the canvas shows, and an inline declaration that would beat the new class is cleared in the same step. The preview is held until the canvas stylesheet covers the new classes, then removed, so nothing flashes unstyled. A whole drag is one history entry.
- **Breakpoint.** A gesture writes at the breakpoint the variant bar is on (`Desktop`, `max-lg`, `max-sm`) and touches no other, so a mobile override never erases the desktop value. The status bar shows which one is live.
- **Capabilities, with a reason.** `inspectFlow(element)` returns what may be done and why not: a flex-row or grid child is sized by its parent, an inline element follows the text, a floated or positioned element is out of flow, siblings reordered by CSS cannot be dragged, and an element whose descendant is positioned by hand refuses to resize rather than pulling the descendant out of place. Blocked controls are not rendered, and `Canvas.FlowStatusBar` says why.
- **Toolbar.** `Canvas.FlowToolbar` floats above the selection, clamped to the canvas width and flipped below it when there is no room. It carries, in order: drag to reposition, the tag, select parent, the layout menu, then a separator, align left / centre / right and text size ∓2 px (written in `rem`, so the page keeps scaling with the reader's own font size), then a separator, width ∓10% on anything that is not text, space below ∓4 px and the height-and-inner-space popover, then a last separator and move earlier / later. Every control carries a tooltip with the same words as its label, and a separator that would end up leading, trailing or doubled hides itself, so a group that `inspectFlow` refuses leaves no mark. A control is only rendered when `inspectFlow` allows it, so the toolbar never offers what the row, the grid or the flow would undo. A click previews inline and commits classes exactly like a drag does, and clicks on the same control within the coalescing window stay one history entry.
- **Tag.** `Canvas.TagControls` sits in the toolbar as the current tag, and opens the same picker as the inspector's: the sixteen editable tags, the ones the HTML content model refuses still on screen but disabled with their reason. It is rendered only when at least one *other* tag is open (`hasRetagOptions`), so a `<li>` in a list, a `<tr>` in a table or an already-cornered element simply has no tag control instead of one that can do nothing. Picking a tag calls `setTag`, which swaps it in place in one history entry — see [Tag picker](#tag-picker).
- **Height and inner space.** The blue handle under the bottom edge, and the toolbar's `Size` popover, set the height of a plain box — `div`, `header`, `section`, `aside`, `article` — as `h-auto min-h-[Npx] max-h-none box-border`, never a fixed height that could cut the content off. A box wrapped in single-child `div`s is treated as a chain of frames: the outer one takes the height and centres the content (`flex flex-col justify-center`), and shrinking spends the padding of every frame proportionally before anything else, down to `pt-[0px] pb-[0px]`. Below that the content wins: the height stops at what the content needs and the status bar says so. The popover's two other fields set the inner space, vertical (`pt-`/`pb-`) and horizontal (`pl-`/`pr-`), from 0 to 160 px; a `p-6` shorthand is rewritten as the sides it still means. A box with a locked or hand-positioned descendant has no handle at all.
- **Reposition.** The purple button in the toolbar moves the whole piece rather than the tag that happens to be selected: `componentOf` promotes an inline to its paragraph, a caption to its figure, and an image to the wrapper or media group that holds it, then up to a `data-responsive-container` marker. Dragging the button starts the move. Clicking it arms the mode, and only then does a drag on the piece itself reposition instead of aligning — a drag never changes meaning without being asked, the same way free transform works. During the drag a dashed ghost follows the pointer with the drop in words, and the editor's own drop indicator marks the destination: a line along the edge for ordering — vertical inside a row, and mirrored in right-to-left — or a box for dropping inside. The pointer decides the gesture at `pointerdown` and never switches mid-drag.
- **Where it can be dropped.** The top and bottom fifths of the element under the pointer order the piece before or after it. The sides make two columns, in a `grid grid-cols-2 max-sm:grid-cols-1 gap-6 items-start clear-both w-full` wrapper, with both children fitted to their new slot. The side of a *paragraph*, when the piece is an object text can wrap around (an `aside`, a `figure`, an image or a media group), floats it instead: the container becomes a `flow-root` and the object takes `w-1/3 float-left mr-6` plus the `max-sm:` pair that stacks it again on a phone. The empty space of a container drops next to its nearest child, and below the last child drops inside. Changing parent applies `fit`, which drops the width, margin, float and grid placement the piece carried from its old parent. A piece that cannot move at all — inside a sentence or a list, transformed, placed by CSS, in a reversed parent — has the button disabled with the reason.
- **Layout menu.** The `Layout` popover next to the reposition button lays out a whole container in one click, each preset a single history entry: select the whole component, a row that aligns its children by centre, top or bottom (`flex flex-row justify-between items-* gap-6`, with `max-sm:flex-col max-sm:items-center` so it stacks on a phone, and each child pinned to the share of the row it already occupies — `w-[47%]`, or `w-auto` once it takes 65% or more), centred contents for one to four paragraphs or headings, two equal columns, one below another, switch order, side by side with the previous or next block, and wrap text with the object on the left or right. The container is the selection itself or, if it is a chain of single-child `div`s, the innermost one. Each entry carries an icon that draws what it does — two boxes meeting at a guide line for the three row alignments, a box with text beside it for the wrap, an arrow into a box for the two neighbours — so the list reads without having to be parsed word by word. A preset the selection cannot take is listed disabled with the reason — `needs at least two children`, `needs exactly two children`, `nothing here for text to wrap around` — so the menu is the same shape everywhere. Every preset writes the base and the `max-sm` half explicitly and leaves the other breakpoints alone, and it clears the inline declaration that would beat each utility it writes.
- **Text flow.** Wrapping text picks the plan from where the text actually is: the paragraphs beside the object, the ones further up once the object sits in a plain wrapper, or the ones outside when the selection is the inner container holding the object. A `div` is only walked through when it carries no background, padding or overflow and draws no border — the width-0 `border-style` a CSS reset leaves on every element does not count — and is not marked `[role]`, `[data-activity-item]` or `[data-section-id]` — a card or an activity is a barrier, so the text inside it never wraps around an object outside it, or the other way round. The chosen container becomes the `flow-root`; when it holds anything else, a `div.flow-root.w-full.min-w-0` is inserted instead and only the object and its text move in. Wrappers along the way go back to `block w-auto min-w-0 max-w-full` and lose their layout classes, paragraphs with no bottom margin get `mb-6`, and the object lands right before the anchor with `w-1/3 float-left mr-6` plus the `max-sm:` pair. The same code runs for the menu and for a float drop, so both write the same thing.
- **Wrap in container.** The button at the end of `Canvas.FlowStatusBar` gives the selection a `div[data-responsive-container="true"]` of its own — the marker `componentOf` and `orderElementOf` already promote a selection to, and the one thing in the lib that writes it. A dialog says what the wrapper will do before it does it, in one of five readings: refused, or image / element crossed with in a slot / not. Outside a row or a grid the wrapper is `style="display:block;width:100%;min-width:0"` and the child is left exactly as it was. Inside one it takes the slot: `style="display:flow-root"` plus the element's own `align-self` when it had one, the classes `w-full min-w-0 max-w-full` and `flex-1` in a row, while the child trades its slot box for `w-[Npx] min-w-0 max-w-full box-border` at the width it was measured at, keeping the margin that matches its current alignment (`mr-auto`, `mx-auto`, `ml-auto`). Only the base breakpoint is rewritten, so the `max-sm:` overrides survive. `canWrapInContainer` refuses with a reason — already a container, the parent is one, the parent cannot hold one, a row that wraps, reorders or runs reversed, a grid cell placed by hand, a descendant positioned or transformed, a lock, an inline that is not an image, loose text in the slot — and the dialog then offers `Select parent` instead. The insert, the move and the class rewrite are one history entry, so one Ctrl+Z puts everything back; if the move were to fail the wrapper is removed again and the selection is left untouched. The selection stays on the element that was wrapped, not on the new container.
- **Many at once.** Shift-clicking a second block hands the selection to its own toolbar and its own dashed outline, drawn around everything selected with each member ringed inside it. Every member is first promoted through up to twelve single-child wrappers that paint nothing of their own, until they all sit in one parent — selecting the card inside a plain `div` groups the `div`s, not the cards. The group is offered only when those promoted members are *contiguous* siblings of a container that can take a drop and nothing in them is locked; otherwise `Canvas.FlowStatusBar` says which of those it was. Its actions are the ones that mean something for several blocks at once: a row with the three alignments, wrap text with the object on the left or right, side by side, one below another. When the members are every child their parent has, the parent itself takes the preset; otherwise a `div` is inserted in their place and only they move into it — `grid grid-cols-N max-sm:grid-cols-1` for side by side, one column per member up to twelve, `grid-cols-1` for one below another, and the row preset's own classes for a row, each member fitted to its new slot or pinned to the share of the row it already occupied. Wrapping text takes the object out of the group and runs the group's own paragraphs around it, leaving the rest of the container where it was. Each action is a single history entry, and the members are selected again at the end of it: inserting a node selects it, so the group would otherwise be lost halfway through.
- **Nothing moves until you let go.** The drag only moves the ghost; the document is touched once, on release, in a single history entry. Escape, a lost pointer, a blurred window or Ctrl+Z abandons it with nothing to undo. Because the piece never leaves its place during the drag, cancelling is exact even inside a flex row. An object that changes parent to be floated keeps the typography it was inheriting, written down before the move.
- **Free transform.** `Inspector.FlowPosition` sits between Spacing and Sizing with the offset in X and Y, a Reset, and a toggle that hands the canvas over: while it is on, dragging the element nudges it, the arrow keys move it by 1 px and by 10 px with Shift, and Escape leaves the mode. It is mutually exclusive with Reposition — turning one on turns the other off — and the element carries `data-responsive-transform` only while the mode is live, which never reaches the output. The offset is written as the CSS `translate` property alone: `transform` is left for the page to use, and **the element keeps its place in the flow**, so its siblings do not reflow as you move it and the other direct controls keep working on it. That is also why `position: absolute` is not the mechanism here — it would make the element `constrained`, and align, resize, space and reorder would all go dark the moment you nudged it. For a page that really is positioned freely, use `layout="fixed"`, which is a complete editor of its own. The numbers come from the model rather than the DOM, so a percentage or a `calc()` already on the element survives: nudging `translate: 50%` writes `calc(50% + 8px)` rather than flattening it to pixels. If a rule with `!important` wins over the inline value, the control says so instead of silently doing nothing.
- **Output.** Only classes and node parents change, so every fidelity guarantee above holds.

## shadcn skin

The same editor with [shadcn/ui](https://ui.shadcn.com) chrome ships as a second entry point, `adt-html-editor/shadcn`. The main entry pulls in none of the skin's UI libraries: they are optional peers that your bundler only reaches when you import the subpath.

```bash
bun add @base-ui/react lucide-react class-variance-authority cmdk react-resizable-panels
```

`cn` is not in that list: both entries merge classes with it, so it is a regular dependency of the package and installs itself.

```css
/* your global CSS (Tailwind v4) */
@import 'tailwindcss';
@import 'shadcn/tailwind.css';
@source '../node_modules/adt-html-editor/dist';
/* plus the shadcn theme tokens from `shadcn init` (--background, --primary, …) */
```

An app that is not built on Base UI does not need the `shadcn` package for this:
the skin only uses its `data-open`, `data-closed`, `data-checked`,
`data-unchecked`, `data-selected`, `data-disabled`, `data-active`,
`data-horizontal` and `data-vertical` custom variants plus the `no-scrollbar`
utility, so copying those declarations into your own CSS is enough.

```tsx
import 'adt-html-editor/style.css'
import { HtmlEditor } from 'adt-html-editor/shadcn'

<HtmlEditor.DefaultLayout defaultValue={html} onChange={setHtml} />
```

- **Same parts, same names.** `HtmlEditor.Layers`, `Canvas`, `Inspector`, `Palette`, `History`, `Layout` and `DefaultLayout` exist on both entries with the same sub-parts, so switching skins is a one-line import change. The skin adds `HtmlEditor.Sidebar` (`Search`, `Tabs`, `Layers`, `Palette`): one search field above a Layers / Palette tab pair, filtering the tree or the blocks depending on the active tab. Its `DefaultLayout` uses the sidebar instead of stacking the palette over the layers, and palette items render a schematic preview of the block they insert. Canvas internals that live inside the page (`FixedPage`, `Guides`, `LiveGhost`, `ImageGhost`, `Handles`, `Viewport`) are re-exported from the core.
- **The default layout is a full editor.** `DefaultLayout` renders `HtmlEditor.Topbar` above a resizable Sidebar / Canvas / Inspector row. The top bar carries undo and redo on the left and leaves the middle and the right to the host app — `<HtmlEditor.DefaultLayout title="index.html" actions={<Button>Publish</Button>} />` — and `topbar={false}` drops it. Compose your own from `HtmlEditor.Topbar.Start`, `.Title` and `.End`. The canvas controls are no longer a bar above the page: `HtmlEditor.Canvas.Dock` floats them in a pill at the bottom of the canvas (mode toggle, breakpoints and dark toggle in flow mode, zoom and dark toggle in fixed mode), and the active breakpoint is labelled above the page the way frames mode already labels each frame.
- **Headless core.** Every skin part is a thin view over a core hook (`useLayerRow`, `useLayersSearch`, `useHistory`, `useZoom`, `useWidthPresets`, `useDarkToggle`, `useVariantBar`, `useClassEditing`, `useClassSuggestions`, `useStyleControl`, `useAttributeFields`, `usePositionFields`, `useTransformFields`, `usePaletteDraggable`) and the `LayersProvider`, `CanvasProvider` and `InspectorProvider` contexts, all exported from the main entry. Write your own skin the same way.
- **Base UI.** Components are generated by the shadcn CLI (`components.json`, style `base-nova`) on top of `@base-ui/react`; `src/shadcn/ui` is updated through `shadcn add --diff`, never edited by hand.
- **Styling.** The skin has no CSS of its own: your Tailwind compiles its classes (hence the `@source` line) and your theme tokens color it. `adt-html-editor/style.css` is optional on a Tailwind host: the selection overlay, the ghosts, the guides and the resize handles are Tailwind classes like everything else, so the `@source` line already emits them. Import it when the host has no Tailwind of its own — it carries a full, unscoped utility layer, which on a Tailwind host duplicates what you already compile and lands those utilities on the whole page. This documentation site leaves it out for exactly that reason. Both entries read the same shadcn tokens, so one theme colors the skin and the core alike. The core's chrome utilities are on the element itself under `adt-chrome`, which the skin never applies, so nothing in `style.css` overrides shadcn classes.
- **Guarantee.** A build test walks the import graph of `dist/index.js` and fails if any skin dependency becomes reachable from the core entry.

### Style sections

The skin inspector renders property-oriented sections instead of raw class toggles: **Layout** (display, direction, justify, align, gap), **Spacing** (padding and margin as one value or four sides), **Sizing** (width and height with a unit picker, optional min/max fields behind a `+` button), **Typography** (family, size with a token picker, weight, style, align, leading, colour), **Appearance** (background, opacity slider, shadow) and **Borders** (width, radius per corner, colour).

- **Inputs commit while you type.** Numeric fields keep a local draft, write the class 200 ms after the last keystroke, flush on blur or `Enter` and revert on `Escape`. Each write updates one node and compiles only the new classes in the Tailwind worker.
- **Breakpoints follow the canvas, desktop-first.** The width preset selected in the canvas toolbar decides which breakpoint the inspector writes to: Desktop writes plain classes, Tablet writes `max-lg:` classes and Mobile writes `max-sm:` classes (the same scheme as the adt-studio style editor; `breakpointForWidth` maps any preset width to one of the three). A field shows the value for the current breakpoint, falling back to the wider ones. Writing a value that equals the fallback removes the override instead of adding a redundant class. Labels of overridden fields turn into a badge with a popover listing both levels and a reset action (`Ctrl`/`⌘`+click resets directly).
- **States are a separate select.** The select above the sections lists only `hover`, `focus`, `active` and `dark`; with none selected you edit the default state. A state combines with the current breakpoint (`max-lg:hover:bg-red-500`), and its values fall back to the same state on wider breakpoints, then to the default state.
- **Inherited values are marked.** Where no class sets a property, the field shows the computed value from the canvas with a dot and a tooltip.
- **Class maps are headless.** Every section is built on `useClassMapControl(id, classMap, fallback, target)` from the main entry, where `target` is `{ breakpoint, state }` (read it from `useInspectorContext()` or `useVariantBar()`), with pure `ClassMap` objects (`paddingClassMap`, `widthClassMap`, `fontSizeClassMap`, `backgroundColorClassMap`, …) that translate between a control value and Tailwind classes. `useOptionalFields` and `useComputedStyles` back the `+` menu and the inherited indicators. Reuse them to build sections for other properties, or use the exported controls (`NumericInput`, `UnitInput`, `TokenInput`, `BoxInput`, `ColorInput`, `StyleSelect`, `StyleRow`, `StyleSection`, `AddFieldButton`) with your own maps.

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

### Tag picker

`HtmlEditor.Inspector.TagHeader` is a richer header for a single selection: the element icon, the tag as a picker, `#id`, the lock toggle, "select parent", the ancestor breadcrumb and a preview of the text. Picking a tag calls the core's `setTag`, which swaps the tag in place — the id, the attributes, the classes, the children, the selection and the collapsed state all survive, and the change is one undo away. `HtmlEditor.Inspector.TagPicker` is the picker on its own, for a header of your own.

Which tags it offers comes from `inspectRetag(doc, id, { locked, editingTextId })` in the main entry, a pure read of the HTML content model over `p`, `h1`–`h6`, `span`, `div`, `section`, `article`, `aside`, `blockquote`, `header`, `footer` and `nav`. A phrase tag is not offered for a box that holds a block; inside a phrasing or inline ancestor only `span` is left; a list, a table, a `picture` or an `svg` parent blocks the swap entirely; `hgroup` leaves only `p` and the headings; `header` and `footer` refuse to nest in each other; `article`, `aside` and `nav` refuse to wrap a `main`; and `address` and `dt` drop the headings and the sectioning tags. Each candidate answers `true` or the reason it cannot — `unsupported`, `locked` or `editing` — the same "capability with a reason" shape as `inspectFlow`, so a blocked tag stays on screen, disabled, with its reason beside it instead of silently going missing. `useRetag(id)` is the headless version: the current tag, the candidates with their reasons, and a `setTag` that refuses a blocked one.

```tsx
import { HtmlEditor } from 'adt-html-editor/shadcn'

<HtmlEditor.Inspector>
  <HtmlEditor.Inspector.Header>
    <HtmlEditor.Inspector.TagHeader />
  </HtmlEditor.Inspector.Header>
  <HtmlEditor.Inspector.Body>
    <HtmlEditor.Inspector.Styles />
  </HtmlEditor.Inspector.Body>
</HtmlEditor.Inspector>
```

## Shortcuts

| Key | Action |
|---|---|
| `Shift+click` (in the canvas) | Add/remove the element from the selection |
| `Ctrl/Cmd+click` (in the tree) | Add/remove the row from the selection |
| `Shift+click` (in the tree) | Select the visible range from the anchor |
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
| `[` / `]` (fixed layout) | Rotate by 1° (`Shift` = 15°), single selection only |

With more than one element selected, the fixed layout draws a frame around the union of their boxes.
Dragging any member moves the whole group by the same delta, and the eight handles scale every
member's position and size proportionally to that frame. Each gesture commits a single history entry.
Rotation and reparenting stay single-selection operations.

## Tailwind in the canvas

The CSS is compiled at runtime by `tailwindcss` v4 running in a **Web Worker** (loaded on demand when the first `<Canvas>` mounts). Only the classes present in the document are compiled.

The generated CSS is isolated in `@scope (.adt-canvas)` — with a selector-prefixing fallback in browsers without `@scope`. Breakpoint media queries are rewritten to container queries:

```
@media (width >= 48rem)  →  @container adt-canvas (width >= 48rem)
```

That is, `sm:` / `md:` / `lg:` and the desktop-first `max-lg:` / `max-sm:` written by the inspector respond to the **canvas width**, not the editor window's. Feature media queries (`hover`, `prefers-color-scheme`, …) are not rewritten.

Class conflicts are resolved with [`cn`](https://github.com/shadcn-ui/cn) — both for the classes written into the document and for the `className` a caller passes to any part. The canvas dark mode uses the `dark:` variant bound to the `.adt-dark` class.

The editor chrome is a separate compilation: `src/lib/styles/base.css` is a Tailwind entry point (theme + utilities, no preflight) that scans the library's own components and is emitted as `dist/style.css` at build time. Nothing in the chrome is hand-written CSS — components carry Tailwind classes, and the ones shared between files live in `*Styles.ts` modules next to them.

## Development

```bash
bun run dev          # docs site + playground at http://localhost:3000
bun run test         # vitest
bun run typecheck    # tsc -b
bun run lint         # oxlint
bun run build        # dist/index.js + dist/style.css + dist/index.d.ts

bun run docs:dev     # builds the library first, then serves the site
bun run docs:build   # builds the library first, then the static site
```

The documentation and the playground live in `apps/docs`, a [Fumadocs](https://fumadocs.dev) site on
TanStack Start (SPA mode). It consumes the library the way an app would — through the package entry
points, resolved to `dist` — so `bun run build` has to run before the site picks up a change.

The site is published to GitHub Pages at <https://zignaggo.github.io/adt-html-editor/> by
`.github/workflows/docs.yml`. It is a project page, so the build runs with
`DOCS_BASE=/adt-html-editor/`; Vite takes that as its `base` and the router reads
`import.meta.env.BASE_URL`. Unset, it falls back to `/`.

Each playground scenario is an entry in `apps/docs/src/components/editor/scenarios.tsx`: the document
it loads, the skin, the layout mode and, when the scenario is about composition, the component that
fills `<HtmlEditor>` (those live in `apps/docs/src/components/editor/compositions`). Any docs page
embeds one with `<EditorDemo scenario="flow-direct" />`. Fixtures are in
`apps/docs/src/components/editor/fixtures`.

## Known limitations (v1)

- Drag and drop uses the native HTML5 API: **desktop-first**, no touch support.
- The canvas renders in the same document (no iframe). A `<style>` inside the edited HTML could affect the editor UI — that is why `<style>` is rendered as an inert placeholder in the canvas.
- `DOMParser` normalizes invalid HTML (closes implicit `<p>`, inserts `<tbody>`). The output is equivalent valid HTML, not the original un-normalized one.
- No `<head>` editing, no real-time collaboration, no reusable symbols/components.
- Pure CSS mode (`styleMode="inline-css"`) has only the adapter (`StyleAdapter`), no dedicated controls.
