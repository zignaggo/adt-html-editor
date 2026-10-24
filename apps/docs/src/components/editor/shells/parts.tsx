import { Check, Copy, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { CodeBlock } from './CodeBlock'
import { FIXTURES, type FixtureId } from '../fixtures'
import { GROUPS, scenariosOf, type Scenario } from '../scenarios'
import type { PlaygroundShellProps, RoundTrip } from './types'

export const BUTTON_CLASS =
  'inline-flex h-7 cursor-default items-center gap-1.5 rounded-md border border-fd-border bg-fd-background px-2 text-xs text-fd-foreground transition-colors duration-150 ease-out hover:bg-fd-accent hover:text-fd-accent-foreground active:translate-y-px'

export function ShellButton({
  children,
  onClick,
  title,
}: {
  children: ReactNode
  onClick: () => void
  title?: string
}) {
  return (
    <button type="button" onClick={onClick} title={title} className={BUTTON_CLASS}>
      {children}
    </button>
  )
}

export function DocumentPicker({
  fixture,
  onChange,
  label = 'Document',
}: {
  fixture: FixtureId
  onChange: (id: FixtureId) => void
  label?: string
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-fd-muted-foreground">
      {label ? <span className="whitespace-nowrap">{label}</span> : null}
      <select
        className="h-7 cursor-default rounded-md border border-fd-border bg-fd-background px-1.5 text-xs text-fd-foreground transition-colors duration-150 ease-out hover:bg-fd-accent"
        value={fixture}
        onChange={(event) => onChange(event.target.value as FixtureId)}
      >
        {FIXTURES.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Actions({
  reset,
  runRoundTrip,
  copy,
  copied,
}: Pick<PlaygroundShellProps, 'reset' | 'runRoundTrip' | 'copy' | 'copied'>) {
  return (
    <>
      <ShellButton onClick={reset}>
        <RotateCcw className="size-3.5" />
        Reset
      </ShellButton>
      <ShellButton onClick={runRoundTrip}>Round-trip</ShellButton>
      <ShellButton onClick={copy}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? 'Copied' : 'Copy HTML'}
      </ShellButton>
    </>
  )
}

export function RoundTripPill({ roundTrip }: { roundTrip: RoundTrip | null }) {
  if (!roundTrip) return null
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] tabular-nums',
        roundTrip.ok
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'bg-fd-error/15 text-fd-error',
      )}
    >
      {roundTrip.message}
    </span>
  )
}

export function ScenarioRail({
  scenario,
  selectScenario,
  className,
}: {
  scenario: Scenario
  selectScenario: (id: string) => void
  className?: string
}) {
  return (
    <nav className={cn('flex min-h-0 flex-col overflow-y-auto p-3', className)}>
      {GROUPS.map((group) => (
        <section key={group} className="mb-4">
          <h2 className="mb-1 px-2 text-[11px] font-medium tracking-[0.06em] text-fd-muted-foreground uppercase">
            {group}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {scenariosOf(group).map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => selectScenario(entry.id)}
                  aria-current={entry.id === scenario.id ? 'true' : undefined}
                  className={cn(
                    'w-full cursor-default rounded-lg px-2 py-1.5 text-start text-sm transition-colors duration-150 ease-out',
                    entry.id === scenario.id
                      ? 'bg-fd-primary/10 font-medium text-fd-primary'
                      : 'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
                  )}
                >
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  )
}

export function TryItList({
  scenario,
  ordered = false,
  className,
}: {
  scenario: Scenario
  ordered?: boolean
  className?: string
}) {
  const List = ordered ? 'ol' : 'ul'
  return (
    <List className={cn('flex flex-col gap-2 text-xs text-fd-muted-foreground', className)}>
      {scenario.tryIt.map((hint, index) => (
        <li key={hint} className="flex gap-2">
          <span className="mt-px inline-flex size-4 flex-none items-center justify-center rounded-full bg-fd-primary/10 text-[10px] font-medium text-fd-primary tabular-nums">
            {index + 1}
          </span>
          <span className="text-pretty">{hint}</span>
        </li>
      ))}
    </List>
  )
}

export function OutputPane({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <CodeBlock lang="html" code={value} title={title} />
    </div>
  )
}
