# Invariants

Principles that only live in prose do not survive agent throughput. Every row here has a check.
Each spec that establishes an invariant adds its checker in the same change. `bun run test` runs
every checker below.

This is the registry for `adt-html-editor`. It mirrors the format of the ADT Studio registry so the
two can be merged when the integration spec lands.

| # | Invariant | Check | Runs | Established by |
|---|-----------|-------|------|----------------|
| 1 | HTML fidelity: `serialize(parse(x))` is idempotent and DOM-equal to the input; attribute order, class order, comments, significant whitespace, opaque node content and the `<!doctype>`/`<head>` envelope are preserved; nothing from the editor leaks into the output (no `data-adt-*`, no selection or overlay class) | `src/lib/core/__tests__/html.test.ts`, one case per fixture in `src/playground/fixtures/`, plus "never leaks internal editor attributes" | every PR | SPEC-0009 |
| 2 | Skin isolation: the core entry never reaches a shadcn peer in its module graph, and neither entry leaks the `@shadcn/` alias into its type declarations | `src/shadcn/__tests__/bundle.test.ts` over the built module graph | every PR | SPEC-0009 |
| 3 | Direct controls commit as classes: a flow gesture adds one history entry, writes Tailwind classes rather than inline style, leaves no preview style on the element, and writes only at the active breakpoint; a cancelled gesture writes nothing | `src/lib/flow/__tests__/flowGestures.test.tsx`, `src/lib/flow/__tests__/flowWrite.test.ts`, `src/lib/style/__tests__/classEdit.test.ts` | every PR | — |
| 4 | Reposition never touches the document until release: a cancelled drag leaves node order, classes and inline style exactly as they were, and a completed one is a single history entry | `src/lib/flow/__tests__/reposition.test.tsx` | every PR | — |
