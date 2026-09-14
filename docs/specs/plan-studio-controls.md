# Plan — studio-style style controls (`adt-html-editor/shadcn`)

Port the UX and behaviour of the adt-studio style editor inputs (numeric fields with debounced commit, unit pickers, token pickers, box editing, colour rows, breakpoint override labels, optional fields) into the shadcn skin, on top of headless core hooks that write Tailwind classes through the editor store. The port keeps the look and the interaction model; it drops the parts that made the original slow (full-page Tailwind rebuild per change, panel-wide re-renders, iframe style snapshots).

Priorities, in this order: **1) the core entry stays dependency-free and gains only pure modules and hooks, 2) every keystroke costs one node update at most, 3) visual and behavioural parity with the studio controls, 4) idiomatic shadcn on Base UI.**

Patterns applied: `vercel-composition-patterns` (headless hooks + styled parts, no boolean skin props), `vercel-react-best-practices` (`rerender-defer-reads`, `rerender-use-ref-transient-values`, derived state instead of effects), the `shadcn` skill (semantic tokens, `render` over `asChild`, `ToggleGroup` for option sets) and `react-doctor` as acceptance.

---

## 0. What is ported and what is not

| Studio piece | Ported as | Notes |
|---|---|---|
| `class-maps/*` (`ClassMap<T>`: `matches / fromClasses / toClasses`) | `src/lib/tailwind/classMaps/*` | Pure, framework-free. Spacing, sizing, typography, layout, appearance, borders, colour. |
| `use-element-styles` (cascade + override + redundancy check) | `useClassMapControl(id, classMap, default, variant)` in core | Cascade follows the editor's mobile-first variants (`base → sm → md → lg → xl`); state variants (`hover`, `focus`, `dark`) fall back to `base`. |
| `use-dynamic-fields` | `useOptionalFields(fields, classes, resetKey)` in core | Derived visibility: a field with a matching class is always shown; manual adds are per-element state. |
| computed-style defaults | `useComputedStyles(id, properties)` in core | One `getComputedStyle` read per selection change, through the existing `useMeasured` observer. |
| `NumericInput`, `UnitInput`, `TokenInput`, `BoxInput`, `ColorInput`/`ColorPicker`, `Select`, `StyleLabel`, `Section`, `AddFieldButton` | `src/shadcn/parts/Inspector/controls/*` | Base UI primitives, semantic tokens (`ring-ring`, `bg-primary`) instead of fixed violet. |
| Sections (Layout, Spacing, Sizing, Typography, Appearance, Borders) | `src/shadcn/parts/Inspector/sections/*` | Rendered by default in the skin inspector; the generic `InspectorCategory` parts stay available. |
| kibo-ui HSV picker (`color` dependency) | Not ported | Custom tab uses the native colour input plus a hex field and a "Transparent" action. |
| Font family combobox tied to studio books | Not ported | A plain `font-sans / serif / mono` select. |
| Desktop-first `max-lg:` / `max-sm:` prefixes | Not ported | The editor is mobile-first; the hook uses `sm:`, `md:`, `lg:`, `xl:`. |

---

## 1. Why the studio controls were slow, and what changes here

| Cost in the studio | Here |
|---|---|
| Every debounced commit re-serialised the section HTML and ran `refreshCss(fullHtml)` (a full Tailwind build) | `setClasses` updates one node; the canvas stylesheet worker compiles only new classes and caches them. |
| All sections read one `classes` array from context, so any change re-rendered the whole panel | Each control subscribes to its node with `useNode(id)`; other controls do not re-render. |
| Computed styles were snapshotted from the iframe on each change | `useComputedStyles` reads once per selection and on DOM mutation, via `requestAnimationFrame`. |
| Draft state synced from props through effects | Draft is `null` while idle and the shown value is derived; no effect, no double render. |
| Radix popovers mounted content eagerly | Base UI popovers portal and mount content only while open. |

---

## 2. Folder structure

```
src/lib/
  tailwind/
    categories.ts                      # variantOf / stripVariants become bracket-aware
    classMaps/
      types.ts                         # ClassMap<T>, BoxValue, UnitValue
      spacingScale.ts                  # px <-> token table shared by spacing, sizing, gap
      color.ts                         # makeColorClassMap(prefix)
      spacing.ts  sizing.ts  typography.ts  layout.ts  appearance.ts  borders.ts
      index.ts
    palette.ts                         # Tailwind families x shades, keyword colours, hex lookups
  style/computed.ts                    # parsePx, weightName, rgbToHex, alignName
  components/Inspector/controls/
    useClassMapControl.ts              # value / setValue / override / isExplicit / reset
    useOptionalFields.ts
    useComputedStyles.ts
src/shadcn/parts/Inspector/
  controls/
    useDraft.ts                        # debounced draft shared by numeric inputs
    NumericInput.tsx  UnitInput.tsx  TokenInput.tsx  BoxInput.tsx  BoxIcons.tsx
    ColorInput.tsx  ColorPicker.tsx  StyleSelect.tsx
    StyleRow.tsx  StyleSection.tsx  AddFieldButton.tsx
  sections/
    InspectorLayout.tsx  InspectorSpacing.tsx  InspectorSizing.tsx
    InspectorTypography.tsx  InspectorAppearance.tsx  InspectorBorders.tsx
    InspectorStyles.tsx                # all sections in the studio order
```

---

## 3. Phases

### C0 — Core: class maps and palette
- [x] `variantOf` / `stripVariants` ignore colons inside `[...]` so arbitrary-property classes stay in `base`.
- [x] `ClassMap<T>`, `BoxValue`, `UnitValue` types.
- [x] Spacing scale table; `paddingClassMap`, `marginClassMap` (shorthand → axis pair → four sides).
- [x] Dimension maps for `w`, `h`, `min-w`, `min-h`, `max-w`, `max-h` (tokens, `full`, fractions, arbitrary `px` / `%` / `rem`).
- [x] Typography maps: family, weight, size (also strips `leading-*`), align, leading, decoration (combined underline + strike), text colour.
- [x] Layout maps: display, flex direction, justify, align items, gap.
- [x] Appearance maps: background colour, opacity, shadow. Border maps: width, radius (corners), colour.
- [x] `palette.ts` with the Tailwind default palette and `hexFromToken` / `tokenFromHex`.
- [x] Unit tests for every map (read, write, round trip, arbitrary values).

### C1 — Core: hooks
- [x] `useClassMapControl(id, classMap, defaultValue, variant)` with cascade, redundancy check against the fallback value, `override` info and `reset`.
- [x] `useOptionalFields(fields, classes, resetKey)`.
- [x] `useComputedStyles(id, properties)` on top of `useMeasured`.
- [x] Tests with `EditorProvider` and `renderHook`.
- [x] Exports from `src/lib/index.ts`.

### S0 — Skin: controls
- [x] `useDraft` (200 ms debounce, flush on blur / Enter, revert on Escape, derived idle value).
- [x] `NumericInput`, `UnitInput` (unit popover, keyword units, `%` clamp), `TokenInput` (Custom / Variables tabs, keyboard list, preview slot).
- [x] `BoxInput` (single / split, side and corner emphasis icons, animated split grid).
- [x] `ColorInput` + `ColorPicker` (row trigger with swatch, Custom tab with native colour input + hex field + transparent, Variables tab with searchable palette grid).
- [x] `StyleSelect` (h-8 muted trigger, option previews), `StyleRow` (label column, override popover with reset, inherited tooltip), `StyleSection`, `AddFieldButton`.

### S1 — Skin: sections
- [x] Layout, Spacing, Sizing (optional min / max), Typography, Appearance (slider opacity), Borders.
- [x] `InspectorStyles` composite; the default skin inspector renders it between Transform and Classes.
- [x] `HtmlEditor.Inspector.{Layout,Spacing,Sizing,Typography,Appearance,Borders,Styles}` namespace entries and `src/shadcn/index.ts` exports.

### S2 — Verification
- [x] Skin tests: numeric draft behaviour, box split, colour palette pick, section writes classes to the store.
- [x] `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, `bunx react-doctor`.
- [x] Playground check with the shadcn layout.
- [x] README section.
