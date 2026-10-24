import { createFileRoute, Link } from '@tanstack/react-router'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { baseOptions } from '@/lib/layout.shared'

export const Route = createFileRoute('/')({
  component: Home,
  head: () => ({
    meta: [
      { title: 'adt-html-editor' },
      {
        name: 'description',
        content:
          'React library for visual HTML editing: element tree, canvas and Tailwind style panel. HTML in, HTML out.',
      },
    ],
  }),
})

const HIGHLIGHTS = [
  {
    title: 'HTML in, HTML out',
    body: 'A string goes in, the user edits, a string comes out. Attributes, comments, entities and opaque nodes survive the round-trip.',
  },
  {
    title: 'Panels you compose',
    body: 'Layers, canvas, inspector and palette are independent roots. Without children they render themselves; with children you decide everything.',
  },
  {
    title: 'Two layout modes',
    body: 'Normal flow with direct canvas controls, and a fixed-layout editor with guides, zoom, resize and rotate for FXL pages.',
  },
  {
    title: 'Tailwind at runtime',
    body: 'Classes in the document are compiled in a worker and scoped to the canvas, so breakpoints answer to the canvas width.',
  },
  {
    title: 'Headless underneath',
    body: 'Every part is a thin view over a hook. parseHtml and serializeHtml work outside React.',
  },
  {
    title: 'shadcn by default',
    body: 'Top bar, layers and palette sidebar, canvas dock and style inspector. The built-in chrome ships in one self-contained stylesheet for everything else.',
  },
]

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-16">
        <p className="font-mono text-xs tracking-[0.08em] text-fd-muted-foreground uppercase">
          React 19 · Tailwind v4
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-fd-foreground text-balance">
          Visual HTML editing you drop into your own app.
        </h1>
        <p className="mt-4 max-w-2xl text-fd-muted-foreground text-pretty">
          An element tree, a canvas and a Tailwind style panel. It takes an HTML string, the user
          edits it, and it gives an HTML string back — nothing from the editor leaks into the
          output.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/playground"
            search={{ scenario: 'default' }}
            className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
          >
            Open the playground
          </Link>
          <Link
            to="/docs/$"
            params={{ _splat: '' }}
            className="rounded-lg border border-fd-border px-4 py-2 text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            Read the docs
          </Link>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <section key={item.title} className="bg-fd-card p-5">
              <h2 className="text-sm font-medium text-fd-foreground">{item.title}</h2>
              <p className="mt-1.5 text-sm text-fd-muted-foreground text-pretty">{item.body}</p>
            </section>
          ))}
        </div>
      </main>
    </HomeLayout>
  )
}
