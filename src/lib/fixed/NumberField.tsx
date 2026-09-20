import type { KeyboardEvent } from 'react'
import { FIELD_LABEL_CLASS, INPUT_CLASS } from '../components/Inspector/inspectorStyles'
import { POSITION_FIELD_CLASS } from './positionStyles'

export type NumberFieldProps = {
  label: string
  value: number | undefined
  disabled?: boolean
  step?: number
  unit?: string
  onCommit: (value: number) => void
}

export function NumberField({
  label,
  value,
  disabled = false,
  step = 1,
  unit,
  onCommit,
}: NumberFieldProps) {
  const shown = value === undefined ? '' : String(Math.round(value * 100) / 100)
  const commit = (raw: string) => {
    const parsed = Number.parseFloat(raw)
    if (Number.isFinite(parsed)) onCommit(parsed)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    commit(event.currentTarget.value)
  }
  return (
    <label className={POSITION_FIELD_CLASS}>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <input
        key={shown}
        type="number"
        className={INPUT_CLASS}
        aria-label={unit ? `${label} (${unit})` : label}
        defaultValue={shown}
        disabled={disabled}
        step={step}
        onBlur={(event) => {
          if (event.target.value !== shown) commit(event.target.value)
        }}
        onKeyDown={onKeyDown}
      />
    </label>
  )
}
