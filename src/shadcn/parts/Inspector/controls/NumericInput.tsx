import type { FocusEventHandler, ReactNode } from 'react'
import { cn } from '../../../lib/utils'
import { FIELD_CLASS, formatNumber } from './fieldStyles'
import { useDraft } from './useDraft'

export type NumericInputProps = {
  value: number
  onCommit: (value: number) => void
  suffix?: ReactNode
  disabled?: boolean
  placeholder?: string
  inputMode?: 'numeric' | 'decimal'
  min?: number
  max?: number
  className?: string
  id?: string
  'aria-label'?: string
  onFocus?: FocusEventHandler<HTMLInputElement>
  onBlur?: FocusEventHandler<HTMLInputElement>
}

export function NumericInput({
  value,
  onCommit,
  suffix,
  disabled = false,
  placeholder = '0',
  inputMode = 'decimal',
  min,
  max,
  className,
  id,
  'aria-label': ariaLabel,
  onFocus,
  onBlur,
}: NumericInputProps) {
  const draft = useDraft({
    value: formatNumber(value),
    commit: (raw) => {
      const trimmed = raw.trim()
      let next = trimmed === '' ? 0 : Number.parseFloat(trimmed)
      if (!Number.isFinite(next)) return
      if (min !== undefined) next = Math.max(min, next)
      if (max !== undefined) next = Math.min(max, next)
      if (next !== value) onCommit(next)
    },
  })

  const input = (
    <input
      id={id}
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      spellCheck={false}
      aria-label={ariaLabel}
      value={draft.shown}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(FIELD_CLASS, suffix ? 'pr-7' : undefined, className)}
      onFocus={(event) => {
        draft.onFocus()
        onFocus?.(event)
      }}
      onBlur={(event) => {
        draft.onBlur()
        onBlur?.(event)
      }}
      onChange={(event) => draft.onChange(event.target.value)}
      onKeyDown={draft.onKeyDown}
    />
  )

  if (!suffix) return input

  return (
    <div className="relative w-full min-w-0">
      {input}
      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-muted-foreground select-none">
        {suffix}
      </span>
    </div>
  )
}
