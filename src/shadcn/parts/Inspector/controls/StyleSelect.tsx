import type { ReactNode } from 'react'
import { cn } from '../../../lib/utils'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select'

export type StyleSelectOption<TValue extends string> = {
  value: TValue
  label: string
  preview?: ReactNode
}

export type StyleSelectProps<TValue extends string> = {
  value: TValue | ''
  onChange: (next: TValue) => void
  options: readonly StyleSelectOption<TValue>[]
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  'aria-label'?: string
}

export function StyleSelect<TValue extends string>({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className,
  id,
  'aria-label': ariaLabel,
}: StyleSelectProps<TValue>) {
  const items = options.map((option) => ({ value: option.value, label: option.label }))
  return (
    <Select
      value={value === '' ? null : value}
      items={items}
      disabled={disabled}
      onValueChange={(next) => {
        if (typeof next === 'string') onChange(next as TValue)
      }}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'h-8 w-full border-0 bg-muted/60 px-2 text-xs shadow-none hover:bg-muted/80 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset data-popup-open:bg-background data-popup-open:ring-1 data-popup-open:ring-ring data-popup-open:ring-inset dark:bg-muted/60',
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.preview ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex w-8 shrink-0 items-center justify-center text-foreground">
                    {option.preview}
                  </span>
                  <span className="text-muted-foreground">{option.label}</span>
                </span>
              ) : (
                option.label
              )}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
