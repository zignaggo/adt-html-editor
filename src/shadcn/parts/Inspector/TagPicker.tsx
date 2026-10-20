import { useState } from 'react'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import type { NodeId } from '../../../lib/core/ids'
import type { RetagBlock } from '../../../lib/flow/tags/retag'
import { useRetag } from '../../../lib/flow/tags/useRetag'
import { cn } from '../../lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { TRIGGER_CLASS } from './controls/fieldStyles'

const BLOCK_LABEL: Record<RetagBlock, string> = {
  unsupported: 'not valid here',
  locked: 'locked',
  editing: 'editing text',
}

const OPTION_CLASS =
  'flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs outline-none ' +
  'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent'

export type TagPickerProps = {
  id: NodeId
  className?: string
}

export function TagPicker({ id, className }: TagPickerProps) {
  const retag = useRetag(id)
  const [open, setOpen] = useState(false)

  if (!retag.tag) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Tag: ${retag.tag}`}
        className={cn(TRIGGER_CLASS, 'h-6 w-auto gap-1 px-1.5 font-mono text-sm font-semibold', className)}
      >
        <span className="truncate">{retag.tag}</span>
        <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        aria-label="Change tag"
        className="max-h-72 w-52 gap-0 overflow-auto p-1"
      >
        {retag.options.map((option) => (
          <button
            key={option.tag}
            type="button"
            disabled={option.blocked !== null}
            aria-current={option.current}
            aria-label={option.blocked ? `${option.tag}, ${BLOCK_LABEL[option.blocked]}` : option.tag}
            className={OPTION_CLASS}
            onClick={() => {
              retag.setTag(option.tag)
              setOpen(false)
            }}
          >
            <span className="flex-1 truncate font-mono">{option.tag}</span>
            {option.blocked ? (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {BLOCK_LABEL[option.blocked]}
              </span>
            ) : null}
            {option.current ? <CheckIcon className="size-3.5 shrink-0" /> : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
