import { Link } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'
import { ArrowUpRight, Play, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { FIXTURE_BY_ID, type FixtureId } from './fixtures'
import { SCENARIO_BY_ID } from './scenarios'

const EditorSurface = lazy(() =>
  import('./EditorSurface').then((module) => ({ default: module.EditorSurface })),
)

export type EditorDemoProps = {
  /** Scenario id from `scenarios.tsx`. */
  scenario: string
  fixture?: FixtureId
  height?: number
  className?: string
}

export function EditorDemo({ scenario: id, fixture, height = 520, className }: EditorDemoProps) {
  const scenario = SCENARIO_BY_ID[id]
  const [started, setStarted] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  if (!scenario) {
    return (
      <div className="rounded-xl border border-fd-border bg-fd-card p-4 text-sm text-fd-muted-foreground">
        Unknown demo: <code>{id}</code>
      </div>
    )
  }

  const fixtureId = fixture ?? scenario.fixture

  return (
    <figure
      className={cn(
        'not-prose my-6 overflow-hidden rounded-xl border border-fd-border bg-fd-card',
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-fd-border px-3 py-2">
        <span className="text-sm font-medium text-fd-foreground">{scenario.label}</span>
        <span className="rounded-full bg-fd-secondary px-2 py-0.5 font-mono text-[11px] text-fd-secondary-foreground">
          {FIXTURE_BY_ID[fixtureId].label}
        </span>
        <div className="ms-auto flex items-center gap-1">
          {started ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
              onClick={() => setResetKey((value) => value + 1)}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </button>
          ) : null}
          <Link
            to="/playground"
            search={{ scenario: scenario.id }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            Playground
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </figcaption>

      <div className="relative" style={{ height }}>
        {started ? (
          <Suspense fallback={<DemoFallback label="Loading the editor…" />}>
            <EditorSurface
              scenario={scenario}
              fixtureId={fixtureId}
              resetKey={resetKey}
              variant="minimal"
            />
          </Suspense>
        ) : (
          <button
            type="button"
            className="group flex size-full flex-col items-center justify-center gap-3 bg-fd-background/40 text-center transition-colors hover:bg-fd-accent/30"
            onClick={() => setStarted(true)}
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-fd-primary text-fd-primary-foreground transition-transform group-hover:scale-105">
              <Play className="size-4 translate-x-px fill-current" />
            </span>
            <span className="max-w-md px-6 text-sm text-fd-muted-foreground">
              {scenario.summary}
            </span>
            <span className="text-xs text-fd-muted-foreground/70">Click to run this demo</span>
          </button>
        )}
      </div>
    </figure>
  )
}

function DemoFallback({ label }: { label: string }) {
  return (
    <div className="grid size-full place-items-center text-sm text-fd-muted-foreground">
      {label}
    </div>
  )
}
