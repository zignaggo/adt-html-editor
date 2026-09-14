import { useId, type KeyboardEvent } from 'react'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '../../ui/input-group'

export type NumberFieldProps = {
  label: string
  value: number | undefined
  disabled?: boolean
  step?: number
  unit?: string
  unitLabel?: string
  onCommit: (value: number) => void
}

export function NumberField({
  label,
  value,
  disabled = false,
  step = 1,
  unit,
  unitLabel,
  onCommit,
}: NumberFieldProps) {
  const id = useId()
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
    <InputGroup className="h-7">
      <InputGroupAddon>
        <InputGroupText className="min-w-4 justify-center font-mono text-xs">
          <label htmlFor={id}>{label}</label>
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        key={shown}
        type="number"
        className="text-xs tabular-nums"
        aria-label={unit ? `${label} (${unit})` : label}
        defaultValue={shown}
        disabled={disabled}
        step={step}
        onBlur={(event) => {
          if (event.target.value !== shown) commit(event.target.value)
        }}
        onKeyDown={onKeyDown}
      />
      {unit ? (
        <InputGroupAddon align="inline-end">
          <InputGroupText className="text-xs">{unitLabel ?? unit}</InputGroupText>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  )
}
