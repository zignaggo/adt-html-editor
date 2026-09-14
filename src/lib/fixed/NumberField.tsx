import type { KeyboardEvent } from 'react'
import inspectorStyles from '../components/Inspector/InspectorPanel.module.css'
import styles from './InspectorPosition.module.css'

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
    <label className={styles.field}>
      <span className={inspectorStyles.fieldLabel}>{label}</span>
      <input
        key={shown}
        type="number"
        className={inspectorStyles.input}
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
