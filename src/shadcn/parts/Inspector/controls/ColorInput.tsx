import { cn } from '../../../lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/popover'
import { ColorPickerBody } from './ColorPicker'
import { resolveHex } from './colorValue'
import { CHECKER_STYLE, TRIGGER_CLASS } from './fieldStyles'

export type ColorInputProps = {
  value: string
  onChange: (next: string) => void
  className?: string
  'aria-label'?: string
}

export function ColorInput({ value, onChange, className, 'aria-label': ariaLabel }: ColorInputProps) {
  const hex = resolveHex(value)
  return (
    <Popover>
      <PopoverTrigger
        aria-label={ariaLabel ? `${ariaLabel}: ${value || 'none'}` : value || 'No colour'}
        className={cn(TRIGGER_CLASS, 'pl-1.5', className)}
      >
        <ColorSwatch hex={hex} />
        <span className={cn('min-w-0 flex-1 truncate', !value && 'text-muted-foreground')}>{value || '—'}</span>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64 gap-0 overflow-hidden p-0">
        <ColorPickerBody value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}

export function ColorSwatch({ hex, className }: { hex: string | null; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-5 shrink-0 overflow-hidden rounded border border-border/60',
        !hex && 'bg-[linear-gradient(to_top_right,transparent_calc(50%-1px),var(--color-destructive)_50%,transparent_calc(50%+1px))]',
        className,
      )}
      style={hex === 'transparent' ? CHECKER_STYLE : hex ? { backgroundColor: hex } : undefined}
    />
  )
}
