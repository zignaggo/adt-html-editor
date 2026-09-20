import { useState } from 'react'
import { LayoutGridIcon, SquareIcon } from 'lucide-react'
import type { BoxValue } from '../../../../lib/tailwind/classMaps/types'
import { cn } from '../../../lib/utils'
import { ToggleGroup, ToggleGroupItem } from '../../../ui/toggle-group'
import { CornerEmphasisIcon, SideEmphasisIcon } from './BoxIcons'
import { NumericInput } from './NumericInput'

export type BoxInputVariant = 'sides' | 'corners'

export type BoxInputProps = {
  value: BoxValue
  onChange: (next: BoxValue) => void
  variant?: BoxInputVariant
  unit?: string
  label?: string
}

type Mode = 'single' | 'split'

const SIDES = ['t', 'r', 'b', 'l'] as const

const SHORT_LABELS: Record<BoxInputVariant, readonly string[]> = {
  sides: ['T', 'R', 'B', 'L'],
  corners: ['TL', 'TR', 'BR', 'BL'],
}

const LONG_LABELS: Record<BoxInputVariant, readonly string[]> = {
  sides: ['Top', 'Right', 'Bottom', 'Left'],
  corners: ['Top left', 'Top right', 'Bottom right', 'Bottom left'],
}

function isUniform(value: BoxValue): boolean {
  return value.t === value.r && value.r === value.b && value.b === value.l
}

export function BoxInput({ value, onChange, variant = 'sides', unit = 'px', label = 'Value' }: BoxInputProps) {
  const [mode, setMode] = useState<Mode>(isUniform(value) ? 'single' : 'split')
  const [focusedSide, setFocusedSide] = useState<keyof BoxValue | null>(null)

  const splitIcon = !focusedSide ? (
    <LayoutGridIcon />
  ) : variant === 'sides' ? (
    <SideEmphasisIcon side={focusedSide} />
  ) : (
    <CornerEmphasisIcon corner={focusedSide} />
  )

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center gap-1">
        <NumericInput
          value={value.t}
          onCommit={(next) => onChange({ t: next, r: next, b: next, l: next })}
          disabled={mode === 'split'}
          suffix={unit}
          aria-label={label}
        />
        <ToggleGroup
          value={[mode]}
          onValueChange={(next) => {
            const picked = (next as string[])[0]
            if (picked) setMode(picked as Mode)
          }}
          variant="outline"
          size="sm"
          spacing={0}
          className="shrink-0"
          aria-label={`${label} mode`}
        >
          <ToggleGroupItem value="single" aria-label="Single value" title="Single value">
            <SquareIcon />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="split"
            aria-label={variant === 'sides' ? 'Individual sides' : 'Individual corners'}
            title={variant === 'sides' ? 'Individual sides' : 'Individual corners'}
          >
            {splitIcon}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div
        inert={mode !== 'split'}
        className={cn(
          'grid grid-cols-4 gap-1 overflow-hidden transition-all duration-300 ease-in-out',
          mode === 'split' ? 'mt-2 max-h-24 opacity-100' : 'pointer-events-none max-h-0 opacity-0',
        )}
      >
        {SIDES.map((side, index) => (
          <div key={side} className="flex min-w-0 flex-col items-stretch gap-0.5">
            <NumericInput
              value={value[side]}
              onCommit={(next) => onChange({ ...value, [side]: next })}
              onFocus={() => setFocusedSide(side)}
              onBlur={() => setFocusedSide(null)}
              aria-label={`${label} ${LONG_LABELS[variant][index].toLowerCase()}`}
              className="h-7 px-1.5 text-center text-[11px]"
            />
            <span className="text-center text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase select-none">
              {SHORT_LABELS[variant][index]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
