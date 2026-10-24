import type { ReactNode } from 'react'
import type { FixtureId } from '../fixtures'
import type { Scenario } from '../scenarios'

export type RoundTrip = { ok: boolean; message: string }

export type PlaygroundShellProps = {
  scenario: Scenario
  fixture: FixtureId
  input: string
  output: string
  roundTrip: RoundTrip | null
  copied: boolean
  surface: ReactNode
  selectScenario: (id: string) => void
  selectFixture: (id: FixtureId) => void
  reset: () => void
  runRoundTrip: () => void
  copy: () => void
}
