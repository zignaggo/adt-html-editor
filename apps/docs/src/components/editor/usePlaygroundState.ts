import { useMemo, useRef, useState, type RefObject } from 'react'
import { parseHtml, serializeHtml, type HtmlEditorHandle } from '@zignaggo/adt-html-editor'
import { fixtureHtml, type FixtureId } from './fixtures'
import { SCENARIOS, SCENARIO_BY_ID, type Scenario } from './scenarios'
import type { RoundTrip } from './shells/types'

export type PlaygroundState = {
  scenario: Scenario
  fixture: FixtureId
  input: string
  output: string
  roundTrip: RoundTrip | null
  copied: boolean
  resetKey: number
  handleRef: RefObject<HtmlEditorHandle | null>
  setOutput: (html: string) => void
  selectScenario: (id: string) => void
  selectFixture: (id: FixtureId) => void
  reset: () => void
  runRoundTrip: () => void
  copy: () => void
}

export function usePlaygroundState({
  scenarioId,
  onSelectScenario,
}: {
  scenarioId: string
  onSelectScenario: (id: string) => void
}): PlaygroundState {
  const scenario = SCENARIO_BY_ID[scenarioId] ?? SCENARIOS[0]
  const [fixtureId, setFixtureId] = useState<FixtureId | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [output, setOutput] = useState('')
  const [roundTrip, setRoundTrip] = useState<RoundTrip | null>(null)
  const [copied, setCopied] = useState(false)
  const handleRef = useRef<HtmlEditorHandle | null>(null)

  const fixture = fixtureId ?? scenario.fixture
  const input = useMemo(() => fixtureHtml(fixture), [fixture])
  const current = output || input

  return {
    scenario,
    fixture,
    input,
    output: current,
    roundTrip,
    copied,
    resetKey,
    handleRef,
    setOutput,
    selectScenario: (id) => {
      onSelectScenario(id)
      setFixtureId(null)
      setOutput('')
      setRoundTrip(null)
    },
    selectFixture: (id) => {
      setFixtureId(id)
      setOutput('')
      setRoundTrip(null)
    },
    reset: () => {
      setResetKey((value) => value + 1)
      setOutput('')
      setRoundTrip(null)
    },
    runRoundTrip: () => {
      const source = handleRef.current?.getHtml() ?? current
      const once = serializeHtml(parseHtml(source))
      const twice = serializeHtml(parseHtml(once))
      setRoundTrip(
        once === twice
          ? { ok: true, message: `Idempotent · ${once.length} bytes` }
          : { ok: false, message: 'Diverged on the second pass' },
      )
    },
    copy: async () => {
      await navigator.clipboard.writeText(handleRef.current?.getHtml() ?? current)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    },
  }
}
