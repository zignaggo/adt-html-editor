import type { ReactNode } from 'react'
import { Redo2Icon, Undo2Icon } from 'lucide-react'
import { useHistory } from '../../../lib/components/Editor/useHistory'
import { cn } from '../../lib/utils'
import { Button } from '../../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'

export type HistoryProps = {
  className?: string
  children?: ReactNode
}

export function HistoryGroup({ className, children }: HistoryProps) {
  return (
    <div role="group" aria-label="History" className={cn('flex items-center gap-1', className)}>
      {children ?? (
        <>
          <HistoryUndo />
          <HistoryRedo />
        </>
      )}
    </div>
  )
}

export function HistoryUndo({ className }: { className?: string }) {
  const { canUndo, undo } = useHistory()
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={className}
            disabled={!canUndo}
            aria-label="Undo"
            aria-keyshortcuts="Control+Z Meta+Z"
            onClick={undo}
          >
            <Undo2Icon />
          </Button>
        }
      />
      <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
    </Tooltip>
  )
}

export function HistoryRedo({ className }: { className?: string }) {
  const { canRedo, redo } = useHistory()
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={className}
            disabled={!canRedo}
            aria-label="Redo"
            aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
            onClick={redo}
          >
            <Redo2Icon />
          </Button>
        }
      />
      <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
    </Tooltip>
  )
}
