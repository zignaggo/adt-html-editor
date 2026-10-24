import { useState } from 'react'
import { cn } from '@/lib/cn'
import { FIXTURE_BY_ID } from '../fixtures'
import {
  Actions,
  DocumentPicker,
  OutputPane,
  RoundTripPill,
  ScenarioRail,
  TryItList,
} from './parts'
import { CodeBlock } from './CodeBlock'
import { snippetFor } from './snippet'
import type { PlaygroundShellProps } from './types'

type DockTab = 'tryIt' | 'output' | 'input' | 'code' | 'notes'

const TABS: { id: DockTab; label: string }[] = [
  { id: 'tryIt', label: 'Try it' },
  { id: 'output', label: 'Output' },
  { id: 'input', label: 'Input' },
  { id: 'code', label: 'Code' },
  { id: 'notes', label: 'Notes' },
]

export function StageShell({
  scenario,
  fixture,
  input,
  output,
  roundTrip,
  copied,
  surface,
  selectScenario,
  selectFixture,
  reset,
  runRoundTrip,
  copy,
}: PlaygroundShellProps) {
  const [tab, setTab] = useState<DockTab | null>(null)

  const toggle = (next: DockTab) => setTab((current) => (current === next ? null : next))

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(230px,250px)_minmax(0,1fr)]">
      <ScenarioRail
        scenario={scenario}
        selectScenario={selectScenario}
        className="hidden border-e border-fd-border bg-fd-card/40 lg:flex"
      />

      <div className="flex min-h-0 min-w-0 flex-col gap-3 bg-fd-muted/40 p-3 lg:p-4">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm">
          <header className="flex h-11 shrink-0 items-center gap-2 border-b border-fd-border px-3">
            <span className="size-1.5 shrink-0 rounded-full bg-fd-primary" aria-hidden="true" />
            <span className="truncate text-sm font-medium text-fd-foreground">
              {scenario.label}
            </span>
            <span className="hidden min-w-0 flex-1 truncate text-xs text-fd-muted-foreground xl:block">
              {scenario.summary}
            </span>
            <div className="ms-auto flex shrink-0 items-center gap-2">
              <DocumentPicker fixture={fixture} onChange={selectFixture} label="" />
              <span className="h-5 w-px bg-fd-border" aria-hidden="true" />
              <Actions reset={reset} runRoundTrip={runRoundTrip} copy={copy} copied={copied} />
              <RoundTripPill roundTrip={roundTrip} />
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden bg-fd-background">{surface}</div>
        </section>

        <section className="shrink-0 overflow-hidden rounded-xl border border-fd-border bg-fd-card">
          <div className="flex h-9 items-center gap-1 px-1.5">
            {TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                aria-pressed={tab === entry.id}
                onClick={() => toggle(entry.id)}
                className={cn(
                  'inline-flex h-7 cursor-default items-center gap-1.5 rounded-md px-2 text-xs transition-colors duration-150 ease-out',
                  tab === entry.id
                    ? 'bg-fd-background font-medium text-fd-foreground shadow-sm'
                    : 'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
                )}
              >
                {entry.label}
                {entry.id === 'tryIt' ? (
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-fd-primary/10 text-[10px] text-fd-primary tabular-nums">
                    {scenario.tryIt.length}
                  </span>
                ) : null}
              </button>
            ))}
            <span className="ms-auto flex items-center gap-2 pe-1.5 text-[11px] text-fd-muted-foreground">
              <span className="tabular-nums">{output.length} bytes</span>
              <span className="font-mono">{FIXTURE_BY_ID[fixture].label}</span>
            </span>
          </div>

          {tab ? (
            <div className="max-h-[34dvh] min-h-[180px] overflow-auto border-t border-fd-border p-3">
              {tab === 'tryIt' ? <TryItList scenario={scenario} ordered /> : null}
              {tab === 'output' ? <OutputPane title="onChange" value={output} /> : null}
              {tab === 'input' ? <OutputPane title="Input" value={input} /> : null}
              {tab === 'code' ? <CodeBlock lang="tsx" code={snippetFor(scenario)} /> : null}
              {tab === 'notes' ? (
                <div className="flex max-w-2xl flex-col gap-2 text-xs text-pretty text-fd-muted-foreground">
                  <p>{scenario.summary}</p>
                  <p>{FIXTURE_BY_ID[fixture].description}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
