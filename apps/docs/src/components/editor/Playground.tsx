import { EditorSurface } from './EditorSurface'
import { usePlaygroundState } from './usePlaygroundState'
import { StageShell } from './shells/StageShell'

export function Playground({
  scenarioId,
  onSelect,
}: {
  scenarioId: string
  onSelect: (id: string) => void
}) {
  const state = usePlaygroundState({ scenarioId, onSelectScenario: onSelect })

  const surface = (
    <EditorSurface
      scenario={state.scenario}
      fixtureId={state.fixture}
      resetKey={state.resetKey}
      handleRef={state.handleRef}
      onChange={state.setOutput}
      variant="full"
    />
  )

  return (
    <StageShell
      scenario={state.scenario}
      fixture={state.fixture}
      input={state.input}
      output={state.output}
      roundTrip={state.roundTrip}
      copied={state.copied}
      surface={surface}
      selectScenario={state.selectScenario}
      selectFixture={state.selectFixture}
      reset={state.reset}
      runRoundTrip={state.runRoundTrip}
      copy={state.copy}
    />
  )
}
