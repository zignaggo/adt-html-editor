import { useState, type ReactNode } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '../../../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/popover'

export type AddFieldOption<TKey extends string> = {
  value: TKey
  label: ReactNode
}

export type AddFieldButtonProps<TKey extends string> = {
  options: readonly AddFieldOption<TKey>[]
  onSelect: (value: TKey) => void
  'aria-label'?: string
}

export function AddFieldButton<TKey extends string>({
  options,
  onSelect,
  'aria-label': ariaLabel = 'Add field',
}: AddFieldButtonProps<TKey>) {
  const [open, setOpen] = useState(false)
  if (options.length === 0) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-xs" aria-label={ariaLabel} title={ariaLabel} />}
        className="text-muted-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
      >
        <PlusIcon />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={4} className="w-44 gap-0 p-1">
        {options.map((option) => (
          <Button
            key={option.value}
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              onSelect(option.value)
              setOpen(false)
            }}
          >
            {option.label}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
