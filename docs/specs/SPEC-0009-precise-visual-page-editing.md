---
id: SPEC-0009
title: Precise visual page editing — element tree, drag reordering, element insertion and fixed-layout mode
status: draft # draft | in-review | approved | in-progress | implemented | verified | superseded
owner: "@zignaggo"
approvers: ["@<integration>", "@<product-owner>"]
issues: []
prs: []
adr: "docs/DECISIONS.md#adr-025"
created: 2026-09-19
updated: 2026-09-19
---

<!-- Retrospective spec. It records a design that already shipped in this repository so that the
     next session — human or agent — inherits it instead of re-deriving it. Per the SDD guide §10,
     its acceptance criteria are the tests that already exist plus the ones that were missing. -->

## Problem (with evidence)

Users asked for precise page editing. The editing surface they had before this library could not
give it to them, for five separate reasons:

- **No element panel.** The document structure was never shown. The only way to reach an element
  was to click it in the rendered page, so anything nested inside another element, anything empty,
  and anything covered by a sibling was unreachable.
- **No reordering.** Elements could not be moved. The order of a page was whatever produced it; a
  page with the right content in the wrong order could not be corrected in place.
- **Drag and drop was slow.** What dragging existed rebuilt React state per pointer frame, so it
  degraded with the size of the page — exactly the pages that need editing most.
- **Styles only.** Editing was restricted to changing the style of an element that already existed,
  through a side panel.
- **No way to add an element.** Nothing could be created. A page missing a heading, a caption or a
  wrapper stayed missing it.
- **No fixed-layout mode.** Pages whose elements are absolutely positioned had no editing at all:
  no move, no resize, no rotation, no alignment.

> **Owner to complete before review.** This section states symptoms but carries no issue links and
> no measurement of the previous editor. The template requires both. Fill in the issue numbers for
> the user requests, and one measurement of the previous drag path (frame time at a known node
> count), or delete the "slow" claim. Do not let an approval pass over this note.

What replaced it is measured. The performance budget is asserted in
`src/lib/core/__tests__/perf.test.ts` against a generated reference document of **at least 2,000
nodes**: parse < 250 ms, serialize < 150 ms, tree flatten < 50 ms, `moveNode` < 20 ms,
`setClasses` < 20 ms, `undo` < 10 ms and restoring by reference rather than copying the tree. The
suite as a whole is **39 files / 455 tests, green** (`bun run test`, 33.6 s, 2026-09-19).

Anchors: the document model and actions in `src/lib/core/{model,store,history}.ts`; parse and
serialize in `src/lib/core/html/`; drop resolution in `src/lib/dnd/resolveDrop.ts`; the fixed-layout
module in `src/lib/fixed/`; the public entry in `src/lib/index.ts`.

## Goals

- The full structure of the page is visible and navigable as a tree, independently of what is
  clickable in the rendering.
- An element can be reordered and reparented — by drag and by keyboard — without regenerating the
  page.
- New elements can be created and placed.
- Absolutely positioned pages are editable: move, resize, rotate, align to guides, and operate on a
  multi-selection as a group.
- Editing is a pure HTML-string transformation: what the workflow puts in is what it gets back,
  minus the user's edits and plus nothing.
- Editing a large page stays inside a measured budget instead of degrading with page size.

## Non-goals

Binding. None of the following is in scope, and no implementation session may expand into them:

- **Integration into ADT Studio.** Recorded separately; see the section below, which is
  deliberately empty.
- Publishing to npm. The library is consumed via `file:` / `bun link`.
- Real-time collaboration or multi-user editing.
- Editing `<head>`, or the content of `<script>`, `<style>`, `<svg>`, `<iframe>` and `<template>`.
  Those are opaque: visible in the tree, movable, removable, re-emitted byte for byte.
- Reusable components or symbols.
- A full plain-CSS authoring mode. Tailwind classes are the style model; `src/lib/style/` is a
  skeleton adapter, not a second mode.
- Touch support. Desktop-first for this version.
- **Byte-for-byte HTML preservation.** The guarantee is DOM equivalence, not textual identity;
  original indentation and line breaks are not preserved.
- Isolating page content in an iframe.
- The design of the shadcn skin (`adt-html-editor/shadcn`). It is a view layer over the same hooks
  and owns no behaviour; its plan is `docs/specs/plan-shadcn.md`.
- Dropping text or HTML from outside the window (`dropTargetForExternal`).
- A consumption test inside a real consumer project.

## Proposed design

The shape: a standalone React library with a single behavioural contract — **an HTML string in, an
HTML string out** — and no knowledge of the workflow around it.

```tsx
<HtmlEditor defaultValue={html} onChange={(html, doc) => …} ref={editorRef} />
```

`onChange` fires on confirmed actions only (drop, class applied, attribute, text on leaving
`contentEditable`, undo/redo) — never per drag frame and never per keystroke. `getHtml()` on the ref
lets the workflow pull the result on its own schedule.

The mechanisms that carry the goals:

| Concern | Chosen mechanism | Why |
|---|---|---|
| Document model | Flat normalized map `Record<NodeId, Node>` plus `children: NodeId[]` | O(1) lookup; a move is two splices; per-node subscription; undo by structural sharing |
| State | One `@tanstack/store` per editor instance, through context | Granular re-render per node, no global state |
| Drag and drop | `@atlaskit/pragmatic-drag-and-drop` with `-hitbox`, `-auto-scroll`, `-live-region` | Native DnD, no React state per frame, preview off the main thread |
| Transient drag state | Separate `dragStore` plus direct style writes on the indicator | Drag frames never re-render the tree or the canvas |
| Canvas | The same document, no iframe, scoped to `.adt-canvas` | Tree, canvas and palette share one `window`, where native DnD works without hacks |
| Style model | Tailwind v4 `compile()` in a Web Worker; `@media` rewritten to `@container` | Real JIT for any class off the main thread; `md:` responds to canvas width, not window width |
| Fixed layout | `src/lib/fixed/`: layout detection, page container, drag, rotation-aware resize, angle and guide snapping, group box | The absolutely positioned case needs geometry, not flow-layout drop targets |

**Alternatives rejected**, as recorded in `docs/specs/plan.md` §1:

- *Iframe canvas* — perfect isolation, but a drag from the tree into an iframe becomes an external
  drag (data only on drop, no hover) and a drag started inside never reaches the parent's monitor.
- *`@tailwindcss/browser` via `<script>`* — scans the whole document with a MutationObserver,
  including the editor's own UI, and offers no scope control.
- *dnd-kit / react-dnd* — pointer-event based with React state per frame; heavier on large trees.

**Decisions the reviewer must ratify:** (1) HTML string in / HTML string out, with DOM equivalence
rather than byte equivalence, as the contract; (2) no iframe — page content and editor chrome share
a document; (3) Tailwind classes as the style model, with plain CSS explicitly not a second mode;
(4) fixed-layout editing as a first-class mode rather than a plugin.

> **Not recorded at the time.** No cost comparison exists for the top-level decision — building a
> separate library against extending the previous editor in place. The owner either supplies it or
> deletes this note; it is not reconstructed here.

## Impact map

- Source, measured on 2026-09-19 (non-test files): `src/lib/core` 1,675 lines · `src/lib/components`
  4,079 · `src/lib/dnd` 937 · `src/lib/fixed` 3,401 · `src/lib/tailwind` 2,064 · `src/lib/style` 115 ·
  `src/shadcn` 6,363.
- Public surface: `src/lib/index.ts` and the `.` / `./shadcn` / `./style.css` entries in
  `package.json`.
- Invariants: two new rows in `docs/INVARIANTS.md` (this repository's registry), both with a checker
  that already exists.
- Data / schema migration: none. The library persists nothing; it holds a document in memory for the
  lifetime of the editor instance.
- Stale documentation found while writing this spec: `docs/specs/plan.md` §1 records CSS Modules plus
  `--adt-*` tokens for the editor chrome. That was superseded by commit `31f1bd3` — the chrome is
  Tailwind against shadcn token names. Per operating rule 7, fixing it belongs to the PR that merges
  this spec.
- Collides with: nothing in this repository. The collisions are on the Studio side and belong to the
  integration spec.

## Acceptance criteria

- [x] **AC-1** The element tree lists every node of the document, respects collapsed state, supports
      search and keeps selection in sync with the canvas.
      *(`Layers/__tests__/flatten.test.ts`, `LayersSelection.test.tsx`, `LayersSearch.test.tsx`)*
- [x] **AC-2** An element can be reordered and reparented by dragging in the tree; every hitbox
      instruction resolves to a `{ parentId, index }`; a move that would create a cycle is refused.
      *(`dnd/__tests__/resolveDrop.test.ts`, `pickDropTarget.test.ts`, `core/__tests__/store.test.ts`)*
- [x] **AC-3** The same reordering is reachable by keyboard, not only by pointer.
      *(`core/__tests__/keyboardMove.test.ts`)*
- [x] **AC-4** An element can be dragged between the tree and the canvas in both directions, with the
      drop position resolved from the canvas hitbox.
      *(`dnd/__tests__/canvasHitbox.test.ts`, `Canvas/__tests__/CanvasSelection.test.tsx`)*
- [ ] **AC-5** A new element can be created from the palette by dragging it into the tree and into the
      canvas, and each insertion produces exactly one history entry.
      *(test missing — to be added at `src/lib/components/Palette/__tests__/paletteInsert.test.tsx`)*
- [x] **AC-6** In fixed-layout mode the layout is detected from the document, and a selected element
      can be moved, resized with the anchor stable under rotation, rotated with angle snapping, and
      snapped to alignment guides; a multi-selection resizes as one group.
      *(`fixed/__tests__/`: `detect`, `fixedDrag`, `resize`, `rotation`, `computeGuides`, `groupBox`,
      `groupResize`, `Handles`, `layoutBox`, `position`, `geometry`, `transformValue`)*
- [x] **AC-7** For every fixture, `serialize(parse(x))` is idempotent and DOM-equal to the input;
      attribute order, class order, comments, significant whitespace, opaque node content byte for
      byte, and the `<!doctype>`/`<head>` envelope of a full document are all preserved.
      *(`core/__tests__/html.test.ts` over `src/playground/fixtures/`)*
- [x] **AC-8** No internal editor attribute (`data-adt-*`) and no selection class ever appears in the
      output. *(`core/__tests__/html.test.ts` — "never leaks internal editor attributes")*
- [x] **AC-9** On a document of at least 2,000 nodes: parse < 250 ms, serialize < 150 ms, tree flatten
      < 50 ms, `moveNode` < 20 ms, `setClasses` < 20 ms without recreating the whole node map, and
      `undo` < 10 ms restoring the previous document **by reference**.
      *(`core/__tests__/perf.test.ts`)*
- [x] **AC-10** A batch operation over 50 nodes (`placeNodes`, `removeNodes`) stays under 20 ms and
      pushes exactly one history entry. *(`core/__tests__/perf.test.ts`)*
- [x] **AC-11** The core entry never reaches a shadcn peer in its module graph; both entries emit type
      declarations and neither leaks the `@shadcn/` alias. *(`shadcn/__tests__/bundle.test.ts`)*

## Test plan

| Level | Location | Covers | Fixtures |
|---|---|---|---|
| Unit — model, history, performance | `src/lib/core/__tests__/` | AC-2 (cycle), AC-3, AC-9, AC-10 | generated 2,000-node document |
| Unit — fidelity | `src/lib/core/__tests__/html.test.ts` | AC-7, AC-8 | every file in `src/playground/fixtures/` (`landing`, `tricky`, `full-document`, `fixed-css`, `fixed-inline`, `fixed-rotated`) |
| Unit — drop resolution | `src/lib/dnd/__tests__/` | AC-2, AC-4 | against the real `-hitbox` package, not the polyfill |
| Unit — geometry | `src/lib/fixed/__tests__/` | AC-6 | the three `fixed-*` fixtures |
| Component | `src/lib/components/*/__tests__/` | AC-1, AC-4 | jsdom + Testing Library |
| Build | `src/shadcn/__tests__/bundle.test.ts` | AC-11 | the built module graph in `dist/` |
| **Missing** | `src/lib/components/Palette/__tests__/paletteInsert.test.tsx` | **AC-5** | a two-node document; assert the inserted node's tag, its parent and index, and `history.past.length === 1` |

Every criterion maps to at least one test. AC-5 is the single criterion whose test does not exist
yet; the Palette is reached today only indirectly, through `pickDropTarget.test.ts`.

## Rollout

The library is already merged and consumed by nothing in production, so there is no rollout in the
usual sense. What remains:

- **PR 1** — this spec, `docs/INVARIANTS.md`, ADR-025, and the `plan.md` §1 correction noted in the
  impact map. No source change.
- **PR 2** — the missing Palette insertion test, closing AC-5. Fast-lane sized. The spec moves to
  `implemented` in the same PR.
- No feature flag and no revert story: nothing here changes behaviour.

## Integration in ADT Studio

**Deliberately empty.** The reviewer is not approving anything in this section, and no implementation
session may act on it. It is recorded here so the gap is visible as a decision, not an omission.

To be filled by a separate spec, which must answer at least:

- [ ] Which Studio surface embeds the editor, and at which pipeline stage the edited HTML is read and
      written back.
- [ ] Whether an element created from the palette must receive its identifier from the Studio's ID
      factory. Invariant 3 of the Studio registry says sections and quizzes are created only via the
      factories; this library mints its own internal `NodeId`s, which never reach the output, so a
      palette-created element leaves the editor with **no** stable identifier at all.
- [ ] How a manual edit made here interacts with staleness (Studio invariant 5 / SPEC-0001) and with
      manual-edit preservation (SPEC-0002). An edited page is a user-touched entity.
- [ ] Whether the `<head>` envelope the editor preserves verbatim is the same envelope the Studio
      expects on the way back.
- [ ] Packages touched, the dependency direction, and the accessibility gate (SPEC-0007).
- [ ] Its own ADR.

## Open questions

- Who owns the Studio integration spec, and by when is it drafted? — **@zignaggo, by 2026-09-26.**
  Default if unanswered: this library stays unconsumed and the question returns at triage.
- Does `src/lib/style/` (the plain-CSS adapter skeleton) graduate or get cut? It is a non-goal of this
  spec but it exists in the tree, and a skeleton nobody owns is how stale surfaces start. —
  **@zignaggo, by 2026-10-03.** Default: cut.
- Does external text/HTML drop (`dropTargetForExternal`, unchecked in `plan.md` Phase 5) ever get
  asked for by a user, or does it stay a non-goal? — **@zignaggo, by 2026-10-03.** Default: stays out.
