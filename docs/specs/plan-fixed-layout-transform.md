# Plan — Resize and rotate in fixed layout mode

Extension of fixed layout mode (`plan-fixed-layout.md`): resize handles on the edges and corners of the selected element, a rotate handle, numeric fields in the inspector and keyboard shortcuts. Everything is written into the `style` attribute (`width`, `height`, `transform: rotate()`), preserving the other declarations.

Priorities, in this order: **1) precise, glitch-free gesture, 2) fidelity to what is already in the book (transform, origin, sizes), 3) everything else.**

Patterns applied: `pragmatic-dnd-core`/`pragmatic-dnd-react` (what **not** to use pdnd for and how to coexist), `vercel-composition-patterns` (explicit parts, state in the provider), `vercel-react-best-practices` (zero re-render per frame, refs for transient values, measurement caching) and `react-doctor` as the acceptance criterion.

---

## 0. What exists today and what changes

| Topic | Today | With this feature |
|---|---|---|
| Canvas selection | `SelectionOverlay` draws the element's bounding box | A new `Canvas.Handles` part draws the element's **layout box** with the same rotation, and the handles on top of it |
| Move | Native drag through pdnd, ghost, guides | Unchanged; starts using the layout box (not the bounding box) for rotated elements |
| Size | Inspector only (`W`, `H`) | Edge and corner handles, `Shift` keeps the ratio, `Alt` resizes from the center, edge snapping to the guides |
| Rotation | None | Handle above the top, `Shift` snaps to 15°, "Angle" field in the inspector, `[` and `]` on the keyboard |
| Writing to the model | `placeNode({ style })` | Same action; gestures write **once**, on `pointerup` |
| Drag ghost | Clone without `transform` | Clone keeps the original's `rotate()`/`scale()` |

Input/output contract untouched: only `style` changes. The fidelity guarantees of the previous plans still hold.

---

## 1. Architecture decisions

| Topic | Decision | Why |
|---|---|---|
| Gesture mechanism | **Pointer events** (`pointerdown` on the handle, `setPointerCapture`, `pointermove`, `pointerup`/`pointercancel`), not pdnd | Resizing and rotating are continuous gestures on a single element, with no drop target. Native drag is throttled, loses events outside the window and gives no angle. The pdnd skill lists "resizing" as a use of the element adapter, but here precision rules. Pointer events give touch for free. |
| Coexistence with pdnd | Handles live in a layer above the element; `pointerdown` on a handle calls `preventDefault()` and the native drag never starts because the pointer is not over the `draggable` | Zero changes to `useFixedDraggable`. During a gesture, `fixedDragStore` stays untouched. |
| Preview | **Imperative on the element itself** (`element.style.width/height/transform`) during the gesture; single commit with `placeNode` on `pointerup` | Text must reflow for the user to see the result; a ghost cannot show that. One commit = one history entry and zero re-render per frame (`rerender-use-ref-transient-values`). `useDomAttributes` reapplies the model's `style` on commit, so the DOM converges. |
| Cancellation | `Esc` or `pointercancel` restores the element's original inline `style` from the snapshot taken on `pointerdown` | Without going through the store. |
| Reference box | **Layout box** (`offsetWidth/Height` and position accumulated through `offsetLeft/Top` up to the coordinate origin), never the bounding box | The bounding box of a rotated element is larger than the element. All handle, drag and inspector geometry uses the layout box plus the rotation. |
| Where the rotation lives | Inline `transform`. The function list is parsed; `rotate()` is updated or inserted **at the end**; existing `translate`, `scale`, `skew` and `matrix` are kept | FXL books use `transform` for responsive scaling and fine positioning. Overwriting would erase that. |
| Angle reading | Inline `rotate()` when declared; otherwise decomposition of the computed matrix (`atan2(b, a)`), separating scale | The inline value is the editable source of truth; the matrix covers rotation coming from `<head>` classes. |
| Rotation origin | Respects the computed `transform-origin`. If it is not `50% 50%`, the anchor and handle math use the real origin | Do not introduce `transform-origin` into `style` unless the user rotates an element without a defined origin (then write `center center` explicitly so the output is deterministic). |
| Resizing a rotated element | The pointer delta is taken into the element's local space (rotation by `−θ`), applied to `width`/`height`, and `left`/`top` are recomputed so the **anchor point** (opposite corner or edge) stays still on the page | It is what the user expects; without it the element "walks" while resizing. Pure, testable math. |
| Units | Integer `px` by default (`fixedLayout.precision`); angle with 0.1° | Consistent with position. |
| `display: inline` elements | Resizing also writes `display: inline-block` | `width`/`height` have no effect on inline. Documented. |
| `<img>` | Writes `width`/`height` in CSS; the HTML `width`/`height` attributes remain | CSS beats the attributes; nothing is lost. |
| Auto height | "Auto height" toggle in the inspector removes `height` from `style` | Text boxes that reflow with content remain possible. |
| Transient state | Imperative `transformGestureStore` (gesture kind, handle, current angle/size) for the badge and the guides | Same as `fixedDragStore`; overlay and badge subscribe without React. |
| Composition | `Canvas.Handles` (root, no boolean props) with `Canvas.Handles.Resize` and `Canvas.Handles.Rotate` sub-parts; `Inspector.Transform` with `Angle`, `AspectLock`, `AutoHeight`; without children it renders everything | `architecture-compound-components`, `patterns-explicit-variants`. Whoever does not want rotation does not render `Handles.Rotate`. |
| Nested elements | Handles operate on the layout box relative to the `offsetParent` and write to the element's own `style`; rotated/scaled ancestors are **out of scope** (handles disabled with a hint) | Composing ancestor matrices is the rare case that complicates the most; dragging already takes the element to the page level, where everything works. |
| Loading | Inside the `FixedPage` chunk (lazy) | `bundle-conditional`. |

---

## 2. Folder structure

```
src/lib/fixed/
  transform/
    layoutBox.ts          # readLayoutBox(el, origin) → { x, y, width, height } without transform
    transformValue.ts     # parseTransform(str) → functions; withRotation(str, deg); rotationOf(el, style)
    rotation.ts           # angleFromPointer(center, pointer), snapAngle(deg, step), normalizeAngle
    resize.ts             # resizeBox({ box, angle, origin, handle, delta, keepRatio, fromCenter, min }) → box
    handles.ts            # HANDLES: 8 handles + rotate; position of each handle on the local box
    transformGestureStore.ts
    useResizeGesture.ts   # pointer events of a size handle
    useRotateGesture.ts   # pointer events of the rotate handle
    gestureCommit.ts      # applyPreview(el, box, angle) and commit(store, id, style)
    Handles.tsx           # Canvas.Handles root + Resize + Rotate (imperative overlay)
    Handles.module.css
    AngleBadge.tsx        # badge with angle/size during the gesture
    InspectorTransform.tsx
    useTransformKeys.ts   # [ ] rotation; Ctrl/⌘+arrows size
  __tests__/
    layoutBox.test.ts transformValue.test.ts rotation.test.ts resize.test.ts handles.test.ts
    Handles.test.tsx  (pointer events in jsdom)
```

Pure modules (`transformValue`, `rotation`, `resize`, `handles`) without DOM; `layoutBox` only uses `offset*`.

---

## 3. Detailed design

### 3.1 Layout box and rotation

`readLayoutBox(element, originElement)` accumulates `offsetLeft/offsetTop` along the `offsetParent` chain up to `originElement`, adds the parents' `clientLeft/clientTop`, and uses `offsetWidth/offsetHeight`. It does not go through `getBoundingClientRect`, so it suffers neither from the element's `transform` nor from the page zoom (values are already in page units).

`rotationOf(element, style)`: `parseTransform(style.transform)` → if there is a `rotate(Xdeg|rad|turn)`, convert to degrees; otherwise `getComputedStyle(element).transform` → matrix → `atan2(b, a)`; `scaleOf` likewise (`hypot(a, b)`, `hypot(c, d)`) so the handle can draw the scaled box without touching the scale.

`withRotation(style, deg)`: rewrites the function list keeping order; `rotate()` updated in place or appended; `deg` normalized to `(-180, 180]` with one decimal; angle `0` removes the `rotate()` (and the whole `transform` if it becomes empty).

### 3.2 Handles overlay (`Canvas.Handles`)

A single element at a time (the selected one). Renders a `div.frame` inside the sibling `GhostLayer` (same absolute layer in page units), positioned by `left/top/width/height` = layout box and `transform: rotate(θ)` with a `transform-origin` equal to the element's. Inside the frame, 8 handles (`nw n ne e se s sw w`) and the `rotate` handle (above `n`, connected by a stem). Each handle's cursor rotates with θ (table of 8 cursors chosen by `(direction + θ) mod 360`).

Imperative updates, like `SelectionOverlay`: subscribes to the store (selection), `MutationObserver` (attrs/childList on the root) and `ResizeObserver`, all coalesced into one `requestAnimationFrame`. No React state per frame. Hides itself during a pdnd drag (`subscribeFixedDrag`) and during text editing.

Accessibility: handles are `button`s with `aria-label` ("Resize from top-left", "Rotate"), `tabIndex=-1`; the keyboard covers the same (3.5). Minimum 24 px screen target: the size in page units is `24 / scale`, recomputed when the zoom changes.

### 3.3 Resize gesture

```
pointerdown(handle h):
  snapshot = { style: el.getAttribute('style'), box: readLayoutBox(el), angle, origin, ratio: w/h, display }
  el.setPointerCapture(pointerId); gestureStore.begin({ kind: 'resize', handle: h, id })
pointermove:
  delta = toPage(pointer) − toPage(pointerDown)          // page units
  local = rotate(delta, −angle)                          // element space
  box' = resizeBox({ box, angle, origin, handle: h, delta: local, keepRatio: shift, fromCenter: alt, min: 1 })
  box' = snapEdges(box', siblings, page, threshold)      // only when angle === 0 (alignable edges)
  applyPreview(el, roundTo(box', precision), angle)      // width/height/left/top inline straight into the DOM
  gestureStore.update({ size })                          // badge "W × H"
pointerup:
  style = sizeDeclarations(positionDeclarations(snapshot.style, box'.x, box'.y), box'.w, box'.h)
  if display was inline → withDeclarations(style, { display: 'inline-block' })
  store.actions.placeNode(id, { style })                 // one history entry
pointercancel / Esc:
  el.setAttribute('style', snapshot.style)
```

`resizeBox` (pure): computes the new size from the local delta and the handle; recomputes `x, y` so the anchor point — the corner/edge opposite the handle, in page coordinates, accounting for the rotation around the origin — stays in the same place. With `fromCenter`, the center is the anchor. With `keepRatio`, the dominant axis of the delta rules and the other follows the snapshot ratio. Minimum 1 px; edge handles only touch one axis.

Sibling rects for snapping are read once on `pointerdown` (`js-cache-function-results`) and invalidated by scroll/zoom.

### 3.4 Rotate gesture

```
pointerdown(rotate handle):
  center = transform origin point in page coordinates (box + transform-origin)
  startAngle = angleFromPointer(center, pointer) − currentRotation
pointermove:
  deg = angleFromPointer(center, pointer) − startAngle
  deg = shift ? snapAngle(deg, 15) : roundTo(deg, 0.1)
  applyPreview(el, box, deg); gestureStore.update({ angle: deg })   // badge "12.5°"
pointerup:
  placeNode(id, { style: withRotation(snapshot.style, deg) })       // + explicit transform-origin if there was none
```

Extra snap without `Shift`: within 1° of a multiple of 90° it sticks (common editor behaviour), disabled with `Alt`.

### 3.5 Keyboard and inspector

- `Ctrl/⌘ + arrows`: width/height ±1 px (`Shift` = 10 px), anchored at the top-left corner. Does not collide with `Alt+arrows` (tree) nor with plain arrows (position).
- `[` and `]`: rotation ∓1°; with `Shift`, ∓15°. Is `Ctrl/⌘+0` already used outside zoom? No; `Ctrl/⌘+Shift+R` "reset rotation" lives in the inspector, not on the keyboard, to avoid fighting the browser.
- Coalescing: key repeat becomes one entry (`placeNode` with `coalesce: true`).
- `Inspector.Transform`: `Angle` (number, °), `Aspect lock` (affects handles and the W/H fields), `Auto height` (removes `height`), `Reset rotation`. `Inspector.Position` keeps X, Y, W, H; W/H start respecting the aspect lock.

### 3.6 Adjustments to what already exists

- `fixedDrag.ts`: drag origin and snapping use `readLayoutBox` (not `readBox`); the final position is `left/top = box + delta`, so rotated elements do not jump. Guides keep using the bounding box for visual alignment.
- `snapshot.ts` (`cloneForPreview`): preserves the original `transform`, applying only the zoom `scale` outside (wrapper), so the drag ghost shows the rotation.
- `SelectionOverlay`: in fixed mode it yields to `Canvas.Handles` (does not draw both). In flow, unchanged.
- `InspectorPosition`: W/H with aspect lock; measurements through `readLayoutBox`.
- `HtmlEditor` namespace: `Canvas.Handles`, `Canvas.Handles.Resize`, `Canvas.Handles.Rotate`, `Inspector.Transform`. `DefaultCanvas` in fixed mode includes the full `Handles`.

---

## 4. Performance rules

- Zero React re-render per frame: the preview writes straight into `element.style`; overlay and badge are updated through `transform`/`style` from the imperative stores.
- At most one `readLayoutBox` per frame; sibling rects, initial angle, origin and aspect ratio come from the `pointerdown` snapshot.
- `pointermove` handlers in `useEffect` with `setPointerCapture`, removed on `pointerup`; nothing global stays permanently (`client-event-listeners`).
- `useEffectEvent`/"latest" ref to read `precision`, `snapThreshold` and `scale` inside handlers without re-registering (`advanced-use-latest`).
- `style` writes grouped into one assignment per frame (`js-batch-dom-css`).
- Acceptance: `npx react-doctor scan` recording 5 s of resizing a text box with 300 siblings, no frame > 16 ms attributed to the editor; `react-doctor --scope changed` at 100.

---

## 5. Phases

### Phase T0 — Pure geometry and transform reading (1 day)
- [ ] `layoutBox.ts`, `transformValue.ts`, `rotation.ts`, `resize.ts`, `handles.ts`.
- [ ] Tests: `transform` parse/rewrite with mixed functions and units (`deg`, `rad`, `turn`); matrix decomposition with scale; `resizeBox` at 0°, 45°, 90° and −30° with a still anchor (0.01 px tolerance), `keepRatio`, `fromCenter`, minimum; angle snapping.
- **Done when**: 100% of the `resizeBox` cases keep the anchor point and `withRotation(withRotation(s, a), b) === withRotation(s, b)`.

### Phase T1 — Rotation-aware drag (0.5 day)
- [ ] `fixedDrag.ts` uses `readLayoutBox`; the ghost preserves `transform`.
- [ ] `fixed-rotated.html` fixture with elements rotated and scaled by class and inline.
- **Done when**: dragging an element at 30° does not change `transform` and the written `left/top` is `original + delta`.

### Phase T2 — Resize handles (2 days)
- [ ] `Handles.tsx` (root + `Resize`), `useResizeGesture`, `gestureCommit`, `transformGestureStore`, `AngleBadge` (shows W × H).
- [ ] `Shift` ratio, `Alt` center, edge snapping at 0°, automatic `display: inline-block`, `Esc` cancels.
- [ ] jsdom tests with `fireEvent.pointerDown/Move/Up`: one history entry per gesture, final `style`, cancellation restores.
- **Done when**: resizing through any handle at 100% and 200% zoom writes `width/height/left/top` equal to what the badge shows, and the opposite corner does not move (test with rects before/after).

### Phase T3 — Rotation (1 day)
- [ ] `Handles.Rotate`, `useRotateGesture`, rotating handle cursors, 15° and 90° snapping, explicit `transform-origin` when needed.
- [ ] Tests: angle from the pointer in every quadrant; single commit; a book with `transform: scale()` keeps the scale.
- **Done when**: rotating and then resizing keeps the anchor still and the original `transform` (besides `rotate`) intact in the output.

### Phase T4 — Inspector and keyboard (1 day)
- [ ] `Inspector.Transform`, aspect lock shared with `Inspector.Position`, `Auto height`, `Reset rotation`.
- [ ] `useTransformKeys` (`Ctrl/⌘+arrows`, `[`/`]`) with coalescing; live region ("Resized to 200 × 80", "Rotated to 15°").
- **Done when**: inspector, keyboard and handles converge to the same `style`; `react-doctor design` without errors in the new parts.

### Phase T5 — Hardening (0.5 day)
- [ ] `react-doctor scan` (300 siblings), a11y (labels, focus, targets ≥ 24 px), README: "Resize and rotate" section and limitations.
- **Done when**: `test`, `lint`, `typecheck` and the react-doctor hook clean; README updated.

---

## 6. Risks and spikes

| Risk | Impact | Mitigation / spike |
|---|---|---|
| Non-centered `transform-origin` or one in `px` | T2–T3 | Read the computed value and convert to box coordinates; tests with `0 0` and `100% 50%`. |
| Rotated or scaled ancestor | T2 | Out of scope: handles disabled with the hint "move the element to the page to edit it"; dragging to the page solves it. |
| Book with inline `transform: matrix(...)` | T0 | Decompose the matrix into rotation and scale, rewrite as `matrix(...)` keeping the other components; snapshot test. |
| Reflowing text changes the height when only the width moves | T2 | Side handles write only `width`; `height` is written only by vertical or corner handles. |
| `%` or `em` in existing `width/height` | T2 | The first gesture freezes to `px` from the layout box (same rule as position). |
| Pointer capture lost (window loses focus) | T2–T3 | `pointercancel` and window `blur` cancel the gesture restoring the snapshot. |
| Conflict with native drag when starting the gesture on the handle | T2 | Handle in its own layer with `pointer-events: auto`, `draggable=false`, `preventDefault()` on `pointerdown`; manual test in Chrome, Firefox and Safari. |
| Wrong handle cursor at intermediate angles | T3 | Table of 8 cursors by 45° sector; unit test of the mapping. |
| 1 px precision after rotation (rounding of recomputed `left/top`) | T2 | Round only on commit, never mid-gesture; the anchor is recomputed from the snapshot, not from the previous frame. |
| Touch | General | Pointer events already work with one finger; multitouch (pinch) out of scope. |

---

## 7. Out of scope

Batch alignment and distribution, skew, editing `transform-origin` through the UI, 3D rotation, pinch resizing, handles on elements inside transformed ancestors.

---

## 8. Group gestures (shipped after the original plan)

Multi-selection was added later and reuses everything above. `EditorState` carries `selectedIds` with
`selectedId` as the anchor, and `placeNodes` commits every member under one history entry.

**Frame.** With more than one member, `Handles` frames the union of the members' layout boxes
(`transform/groupBox.ts`), forces angle 0, labels itself `N elements` and sets `data-group="true"`,
which hides the rotate handle. It is disabled when any member is locked or sits under a transformed
ancestor.

**Resize.** `takeGroupSnapshot` records one `MemberSnapshot` per member plus the union box.
`startGroupResizeGesture` resizes that union with the existing `resizeBox` (angle 0, center origin)
and maps each member through `scaleBoxWithin`, so positions and sizes scale proportionally.
`minGroupSize` raises the minimum so no member can collapse below 1 px; `ResizeArgs.min` therefore
accepts a `Size` as well as a number. Only the axes that actually scaled get `width`/`height`
written. A member with a rotation keeps its `transform` and has its unrotated layout box scaled.
Single selection keeps the original rotation-aware path untouched.

**Drag.** The drag session holds `members` instead of one node. The delta is computed once from the
union box and applied to every member through its own `styleOrigin`. Members that are locked or under
a transformed ancestor are skipped. A group drag never reparents; a single drag still moves the
element into the page container as before. The live ghost renders one clone per member inside a
single moved wrapper, falling back to a group outline above `MAX_LIVE_CLONES`.

**Keyboard.** Arrow nudge moves every member in one coalesced entry; `Ctrl/Cmd+arrows` scales the
group from its top-left; `[` / `]` are ignored with more than one member.
