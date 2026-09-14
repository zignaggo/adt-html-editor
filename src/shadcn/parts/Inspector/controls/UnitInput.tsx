import { useState } from 'react'
import { KEYWORD_UNITS } from '../../../../lib/tailwind/classMaps/sizing'
import type { UnitValue } from '../../../../lib/tailwind/classMaps/types'
import { cn } from '../../../lib/utils'
import { Button } from '../../../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/popover'
import { FIELD_CLASS } from './fieldStyles'
import { useDraft } from './useDraft'

export type UnitInputProps = {
  value: UnitValue
  onChange: (next: UnitValue) => void
  units?: readonly string[]
  placeholder?: string
  id?: string
  'aria-label'?: string
}

const NUMERIC = /^\d*\.?\d*$/

export function UnitInput({
  value,
  onChange,
  units = ['px', '%'],
  placeholder = '0',
  id,
  'aria-label': ariaLabel,
}: UnitInputProps) {
  const [open, setOpen] = useState(false)
  const isKeyword = KEYWORD_UNITS.has(value.unit)
  const draft = useDraft({
    value: value.value,
    commit: (raw) => {
      if (raw !== value.value) onChange({ value: raw, unit: value.unit })
    },
  })

  const onInput = (raw: string) => {
    if (raw !== '' && !NUMERIC.test(raw)) return
    let next = raw
    if (raw !== '' && value.unit === '%') {
      const amount = Number.parseFloat(raw)
      if (amount < 0) next = '0'
      else if (amount > 100) next = '100'
    }
    draft.onChange(next)
  }

  const selectUnit = (unit: string) => {
    setOpen(false)
    if (unit === value.unit) return
    if (KEYWORD_UNITS.has(unit)) {
      onChange({ value: unit, unit })
      return
    }
    onChange({ value: isKeyword ? '' : draft.shown, unit })
  }

  return (
    <div className="relative w-full min-w-0">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        aria-label={ariaLabel}
        value={isKeyword ? value.unit : draft.shown}
        placeholder={placeholder}
        disabled={isKeyword}
        className={cn(FIELD_CLASS, 'pr-10', isKeyword && 'text-muted-foreground italic disabled:opacity-100')}
        onFocus={draft.onFocus}
        onBlur={draft.onBlur}
        onChange={(event) => onInput(event.target.value)}
        onKeyDown={draft.onKeyDown}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={`Unit: ${value.unit}`}
          className="absolute top-0 right-0 flex h-8 w-9 cursor-pointer items-center justify-center rounded-r-md text-[11px] font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset"
        >
          {isKeyword ? <span className="size-1.5 rounded-full bg-current" /> : value.unit}
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={4} className="w-auto min-w-16 gap-0 p-1">
          {units.map((unit) => (
            <Button
              key={unit}
              variant={unit === value.unit ? 'secondary' : 'ghost'}
              size="xs"
              className="justify-center"
              onClick={() => selectUnit(unit)}
            >
              {unit}
            </Button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  )
}
