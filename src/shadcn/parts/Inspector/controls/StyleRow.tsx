import { useState, type ReactNode } from 'react'
import { RotateCcwIcon } from 'lucide-react'
import type { ClassMapOverride } from '../../../../lib/components/Inspector/controls/useClassMapControl'
import { cn } from '../../../lib/utils'
import { targetLabel } from '../../../../lib/tailwind/variants'
import { Badge } from '../../../ui/badge'
import { Button } from '../../../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../ui/tooltip'
import { LABEL_CLASS } from './fieldStyles'

export type StyleRowProps = {
  label: ReactNode
  htmlFor?: string
  children: ReactNode
  override?: ClassMapOverride | null
  inherited?: boolean
  className?: string
}

const MODIFIER_LABEL =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'

function hasResetModifier(event: Event | undefined): boolean {
  if (!(event instanceof MouseEvent)) return false
  return event.metaKey || event.ctrlKey || event.altKey
}

export function StyleRow({ label, htmlFor, children, override, inherited = false, className }: StyleRowProps) {
  return (
    <div className={cn('grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-2', className)}>
      {override ? (
        <OverrideLabel override={override}>{label}</OverrideLabel>
      ) : inherited ? (
        <Tooltip>
          <TooltipTrigger render={<span />} className={cn(LABEL_CLASS, 'cursor-help')}>
            <span aria-hidden="true" className="inline-block size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="truncate">{label}</span>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={12}>
            Inherited from a parent element. Set a value here to override it.
          </TooltipContent>
        </Tooltip>
      ) : (
        <label htmlFor={htmlFor} className={LABEL_CLASS}>
          <span className="truncate">{label}</span>
        </label>
      )}
      <div className="flex min-h-8 min-w-0 items-center gap-1.5">{children}</div>
    </div>
  )
}

function OverrideLabel({ override, children }: { override: ClassMapOverride; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={(next, details) => {
        if (next && hasResetModifier(details.event)) {
          override.reset()
          return
        }
        setOpen(next)
      }}
    >
      <PopoverTrigger
        className={cn(
          LABEL_CLASS,
          'cursor-pointer rounded-md bg-primary/10 text-primary transition-colors outline-none hover:bg-primary/15 focus-visible:ring-1 focus-visible:ring-ring',
        )}
        title={`${MODIFIER_LABEL}+click to reset`}
      >
        <span className="truncate">{children}</span>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={6} className="w-64 gap-0 overflow-hidden p-0">
        <div className="flex flex-col gap-2 border-b px-3 pt-3 pb-2.5">
          <span className="text-[10px] font-medium tracking-wider text-primary uppercase">Breakpoint override</span>
          <OverrideRow label={targetLabel(override.target)} classes={override.classes} />
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">Falls back to</span>
          <OverrideRow label={targetLabel(override.fallbackTarget)} classes={override.fallbackClasses} muted />
        </div>
        <div className="flex flex-col gap-2 p-2">
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              override.reset()
              setOpen(false)
            }}
          >
            <RotateCcwIcon data-icon="inline-start" />
            Reset to {targetLabel(override.fallbackTarget)}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            Tip: {MODIFIER_LABEL}+click the label to reset.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function OverrideRow({ label, classes, muted = false }: { label: string; classes: string[]; muted?: boolean }) {
  return (
    <div className={cn('flex items-start gap-2', muted ? 'text-muted-foreground' : 'text-foreground')}>
      <Badge variant={muted ? 'outline' : 'secondary'} className="shrink-0 font-mono">
        {label}
      </Badge>
      <span className="min-w-0 flex-1 font-mono text-[10.5px] leading-snug break-all">
        {classes.length > 0 ? classes.join(' ') : '(default)'}
      </span>
    </div>
  )
}
