# Decisions

Architecture decision records for `adt-html-editor`. One page at most each. Numbering continues the
ADT Studio sequence (last recorded there: ADR-024, 2026-09-11) so the two files can be merged when
the integration spec lands.

## ADR-025 — Precise page editing is a standalone library that takes an HTML string and returns an HTML string, edited in the same document

**Date:** 2026-09-19   **Status:** proposed
**Spec:** SPEC-0009   **Issues:** —

*Recorded after the fact. The decision was made and implemented before this record existed; the date
above is the date of the record, not of the decision.*

### Context

The previous editing surface could only change the style of an element that already existed. It had
no element panel, no reordering, no way to create an element, and no editing at all for absolutely
positioned pages; what dragging existed rebuilt React state per pointer frame. Users asked for
precise editing, which none of those five gaps allowed. The design that answered them was never
written down, so the next session touching page editing would have had to re-derive it.

### Decision

Precise page editing is a standalone React library with one behavioural contract: an HTML string in,
an HTML string out, guaranteeing DOM equivalence rather than byte equivalence. Page content and
editor chrome share a single document — no iframe — so native drag and drop works across the tree,
the canvas and the palette without a boundary. Tailwind classes are the style model, compiled at
runtime in a Web Worker and scoped to the canvas. Absolutely positioned pages are a first-class
editing mode, not a plugin.

### Consequences

The workflow around the editor stays ignorant of how editing works: it hands over a string and gets
one back. Fidelity becomes machine-checked — round-trip idempotence and DOM equivalence per fixture,
and no editor attribute in the output (invariant 1). Because there is no iframe, page CSS has to be
scoped rather than isolated, and the editor's own chrome must never be reachable by the page's
Tailwind. Because the guarantee is DOM equivalence, a consumer that needs the original formatting
byte for byte cannot use this editor. Plain CSS is not a second authoring mode, so a page whose
styling is not expressible in Tailwind classes is editable in structure but not fully in style.

### Alternatives rejected

- Iframe canvas — a drag from the tree into an iframe becomes an external drag, and a drag started
  inside never reaches the parent's monitor.
- `@tailwindcss/browser` via `<script>` — scans the whole document, including the editor's own UI,
  with no scope control.
- dnd-kit / react-dnd — pointer-event based with React state per frame; heavier on large trees.
