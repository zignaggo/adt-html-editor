---
name: pragmatic-dnd
description: Router/guide for all Pragmatic drag and drop (@atlaskit/pragmatic-drag-and-drop) work. Use this skill FIRST whenever the user mentions Pragmatic drag and drop, pdnd, @atlaskit/pragmatic-drag-and-drop, or wants to build any drag and drop experience (lists, boards, kanban, sortable items, file dropzones, drag previews, drop indicators) with Atlassian's drag and drop library — even if they don't name the library explicitly but the project already uses it. This skill tells you which specialized pragmatic-dnd-* skill to consult for the task at hand.
---

# Pragmatic drag and drop — Skill router

Pragmatic drag and drop (pdnd) is Atlassian's low-level, framework-agnostic drag and drop library built on the browser's native HTML5 drag and drop API. This skill does not contain implementation details — its job is to route you to the right specialized skill and give you just enough shared context to route correctly.

## How to use this router

1. Identify the task type from the table below.
2. Read the SKILL.md of the matching skill(s) before writing any code.
3. When a task spans both (very common — e.g. "build a sortable list in React"), read `pragmatic-dnd-core` first for the mental model and API, then `pragmatic-dnd-react` for the integration patterns.

## Routing table

| Task involves... | Consult skill |
|---|---|
| Core concepts: adapters (element / text-selection / external), `draggable`, drop targets, monitors, events, `combine`, `reorder`, `preventUnhandled`, stickiness, nested drop targets, typing `data`, drag previews, entry points / install | `pragmatic-dnd-core` |
| File drop zones, dragging text/URLs/HTML from other windows or apps | `pragmatic-dnd-core` (external adapter reference) |
| React components: attaching pdnd in `useEffect`, drag state with `useState`, custom drag previews via portals, drop indicators, deferred/lazy loading, virtualized lists (react-window, react-virtuoso, etc.) | `pragmatic-dnd-react` (plus `pragmatic-dnd-core` for the underlying API) |
| Framework-agnostic / vanilla JS / other frameworks (Vue, Svelte...) | `pragmatic-dnd-core` only |

## Shared context (applies to every skill)

- Core package: `@atlaskit/pragmatic-drag-and-drop`. It is vanilla JS (authored in TypeScript) and works with any view library.
- The library uses **entry points** instead of a root export, to guarantee small bundles without relying on tree shaking. Always import from the specific entry point, e.g. `@atlaskit/pragmatic-drag-and-drop/element/adapter`, never from the package root.
- The three primitives are: **adapters** (teach pdnd about an entity type), **drop targets** (elements that can be dropped on), and **monitors** (global listeners). Every `draggable()`, `dropTargetFor*()` and `monitorFor*()` call returns a cleanup function.
- Optional companion packages exist and can be suggested when relevant (do not invent APIs for them — if the task depends heavily on one and you don't know its API, say so and point the user to its docs page):
  - `@atlaskit/pragmatic-drag-and-drop-hitbox` — closest-edge / hitbox info for drop targets (plain JS; used for reorder indicators)
  - `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator` — React components for drop indicator lines
  - `@atlaskit/pragmatic-drag-and-drop-auto-scroll` — automatic scrolling during drags (plain JS)
  - `@atlaskit/pragmatic-drag-and-drop-flourish` — small effects (e.g. flash on drop)
  - `@atlaskit/pragmatic-drag-and-drop-react-accessibility` — opinionated React a11y controls
  - `@atlaskit/pragmatic-drag-and-drop-live-region` — screen reader announcements
  - `@atlaskit/pragmatic-drag-and-drop-react-beautiful-dnd-migration` — migration layer from react-beautiful-dnd
  - `@atlaskit/pragmatic-drag-and-drop-unit-testing` — unit test helpers

## Future skills

This family is designed to grow. If a task matches a domain listed here but the corresponding skill does not exist yet in the catalog (e.g. `pragmatic-dnd-testing`, `pragmatic-dnd-accessibility`, `pragmatic-dnd-optional-packages`), fall back to `pragmatic-dnd-core` and clearly tell the user which parts you could not verify against documentation.
