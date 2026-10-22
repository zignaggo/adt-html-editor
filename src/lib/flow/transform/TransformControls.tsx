import {
  FIELD_CLASS,
  FIELD_HINT_CLASS,
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
  STATUS_BUTTON_CLASS,
} from '../flowStyles'
import type { FlowTarget } from '../useFlowSelection'
import { useFreeTransform, type FreeTransform } from './useFreeTransform'

const CONFLICT_HINT = 'A style rule is winning over this offset.'

function numberOf(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function TransformControls({ target }: { target: FlowTarget }) {
  const transform = useFreeTransform(target)
  if (!transform || transform.blocked !== null) return null
  return <TransformFields transform={transform} />
}

function TransformFields({ transform }: { transform: FreeTransform }) {
  const { offset, active, conflict } = transform

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <label className={FIELD_CLASS}>
          <span className={FIELD_LABEL_CLASS}>X</span>
          <input
            type="number"
            className={FIELD_INPUT_CLASS}
            value={Math.round(offset.x)}
            onChange={(event) => {
              const next = numberOf(event.target.value)
              if (next !== null) transform.setAxis('x', next)
            }}
          />
        </label>
        <label className={FIELD_CLASS}>
          <span className={FIELD_LABEL_CLASS}>Y</span>
          <input
            type="number"
            className={FIELD_INPUT_CLASS}
            value={Math.round(offset.y)}
            onChange={(event) => {
              const next = numberOf(event.target.value)
              if (next !== null) transform.setAxis('y', next)
            }}
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={STATUS_BUTTON_CLASS}
          aria-pressed={active}
          onClick={transform.toggle}
        >
          {active ? 'Done transforming' : 'Free transform'}
        </button>
        <button
          type="button"
          className={STATUS_BUTTON_CLASS}
          disabled={!transform.canReset}
          onClick={transform.reset}
        >
          Reset
        </button>
      </div>

      {conflict ? <p className={FIELD_HINT_CLASS}>{CONFLICT_HINT}</p> : null}
    </div>
  )
}
